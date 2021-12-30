mod add_student;
mod login;
mod schema;

use std::{env, process::id};

use actix_files as fs;
use actix_web::{get, post, web, App, HttpRequest, HttpResponse, HttpServer};
use chrono::Local;
use futures::{
    stream::{StreamExt},
    TryFutureExt,
};
use log::*;
use mongodb::{bson::doc, options::ClientOptions, Client};
use simple_logger::SimpleLogger;

use crate::{add_student::AddStudentRequest, schema::student::Student};

const DATABASE: &str = "attendance";
const COLLECTION: &str = "people";

struct AppState {
    client: Client,
}

#[post("/api/echo")]
async fn echo(data: String) -> HttpResponse {
    info!("Echo {}", data);
    HttpResponse::Ok().body(data)
}

#[get("/api/get_here")]
async fn get_students(state: web::Data<AppState>) -> HttpResponse {
    info!("Getting students at lab");
    let collection = state
        .client
        .database(DATABASE)
        .collection::<Student>(COLLECTION);

    let students = collection
        .find(doc! {"login_status": {"$ne": Option::<String>::None}}, None)
        .await
        .unwrap();
    let students = students
        .map(|x| {
            let x = x.unwrap();
            AddStudentRequest {
                id: x.id,
                subteam: x.subteam,
                name: x.name,
            }
        })
        .collect::<Vec<AddStudentRequest>>()
        .await;

    return HttpResponse::Ok().body(serde_json::to_string(&students).unwrap());
}

#[post("/api/login")]
async fn login_request(
    form: web::Json<login::LoginRequest>,
    state: web::Data<AppState>,
) -> HttpResponse {
    let mut session = state.client.start_session(None).await.unwrap();

    let collection = state
        .client
        .database(DATABASE)
        .collection::<Student>(COLLECTION);
    match collection
        .find_one_with_session(doc! {"id": form.id}, None, &mut session)
        .await
        .unwrap()
    {
        Some(mut student) => {
            // Student has been found
            info!("Found student {}", form.id);
            let mut leaving = false;
            let mut time_spent = 0;
            if student.login_status.is_some() {
                // We are currently at lab, therefore log out and add an event
                let event = (student.login_status.unwrap(), Local::now());
                time_spent = (event.1 - event.0).num_seconds();
                student.valid_time += time_spent;
                info!(
                    "Logging {} out at {} with {} minutes at lab",
                    student.name,
                    Local::now(),
                    time_spent
                );
                student.events.push(event);
                student.login_status = None;
                leaving = true;
            } else {
                // We are just signing into lab, therefore just log in and do not add an event
                student.login_status = Some(Local::now());
                info!("Logging {} in at {}", &student.name, Local::now());
            }
            let name = student.name.clone();
            collection
                .replace_one_with_session(doc! {"id": form.id}, student, None, &mut session)
                .await
                .unwrap();

            HttpResponse::Ok().body(
                serde_json::to_string(&login::LoginResponse {
                    leaving,
                    time_spent,
                    name,
                })
                .unwrap(),
            )
        }
        None => {
            // Student was not found in database
            warn!("Student {} not found", form.id);
            HttpResponse::NotFound().body("")
        }
    }
}

#[post("/api/add_students")]
async fn add_students(
    form: web::Json<add_student::AddStudentRequest>,
    state: web::Data<AppState>,
) -> HttpResponse {
    let collection = state
        .client
        .database(DATABASE)
        .collection::<Student>(COLLECTION);
    let student = Student {
        id: form.id,
        name: form.clone().name,
        valid_time: 0,
        events: Vec::new(),
        login_status: None,
        subteam: form.clone().subteam,
    };

    match collection.insert_one(student, None).await {
        Ok(_) => {
            info!("Adding student {:?}", form);
            HttpResponse::Accepted().body("")
        }
        Err(e) => {
            warn!("Adding student {} failed with {:?}", form.id, e);
            HttpResponse::Conflict().body("")
        }
    }
}

async fn get_client() -> Result<Client, mongodb::error::Error> {
    let password = env::var("MONGO_PASSWD").expect("MONGO_PASSWD not set");
    let client_options = ClientOptions::parse(format!(
        "mongodb+srv://luca:{}@cluster0.sgpww.mongodb.net/attendance?retryWrites=true&w=majority",
        password
    ))
    .await?;
    let client = Client::with_options(client_options)?;
    Ok(client)
}

#[actix_web::main]
async fn main() -> Result<(), actix_web::Error> {
    // SimpleLogger::new()
    //     .with_level(LevelFilter::Info)
    //     .init()
    //     .unwrap();
    trace!("Started logger");

    let client = get_client().await.unwrap();

    HttpServer::new(move || {
        App::new()
            .data(AppState {
                client: client.clone(),
            })
            .service(add_students)
            .service(login_request)
            .service(get_students)
            .service(echo)
            .service(fs::Files::new("/", "./static/build").index_file("index.html"))
    })
    .bind("0.0.0.0:".to_owned() + &env::var("PORT").unwrap_or("8080".to_owned()))?
    .run()
    .await?;

    return Ok(());
}
