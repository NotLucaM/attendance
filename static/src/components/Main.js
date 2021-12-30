import NavBar from "../navBar";
import React, {useState} from "react";
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';

function Main() {
    const [text, setText] = useState('')
    const [helper, setHelper] = useState('')
    const [error, setError] = useState(false)

    const isValid = (t) => {
        let valid = /^\d+$/.test(t);
        valid &= t.length === 8
        valid |= t.length === 0
        setHelper('')
        if (!valid) {
            setError(true);
            setText(t);
            return false;
        } else {
            setError(false);
            setText(t);
            return true;
        }
    }
    const handleKeyDown = (event) => {
        event.preventDefault();
        if (event.key === 'Enter') {
            if (isValid(text)) {
                add_student(text)
            }
            setText('')
        }
    }

    const add_student = (text) => {
        console.log("Requesting to add " + text);

        const request_options = {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: parseInt(text) })
        }

        // TODO: add error handling
        fetch("http://127.0.0.1:3030/api/login", request_options)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                if (data.leaving) {
                    setHelper("Goodbye " + data.name + ", you stayed " + Math.round(data.time_spent / 60) + " minutes");
                } else {
                    setHelper("Welcome " + data.name);
                }
            })
    }

    return (
        <React.Fragment>
            <Box
                component="TextField"
                sx={{
                    '& .MuiTextField-root': { m: 1, width: '25ch' },
                }}
                noValidate
                autoComplete="off"
                onKeyUp={handleKeyDown}
                width={500} height={80}
                alignItems="center"
                alignContent="center"
                justifyContent="center"
            >
                <TextField
                    id="login-box"
                    label="Student ID"
                    variant="standard"
                    error={error}
                    value={text}
                    helperText={helper}
                    onChange={s => isValid(s.target.value)}/>
            </Box>
        </React.Fragment>
    );
}

export default Main;
