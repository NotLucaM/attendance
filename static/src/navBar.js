import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import {
    MemoryRouter,
    Route,
    Routes,
    Link,
    matchPath,
    useLocation,
} from 'react-router-dom';
import { StaticRouter } from 'react-router-dom/server';
import Main from "./components/Main";
import AddStudent from "./components/AddStudent";
import Current from "./components/Current";
import {AppBar, Container, Icon, Toolbar} from "@mui/material";
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import AlignVerticalBottomIcon from '@mui/icons-material/AlignVerticalBottom';
import FunctionsIcon from '@mui/icons-material/Functions';
import Filter8Icon from '@mui/icons-material/Filter8';
import Admin from "./components/Admin";
import {useState} from "react";
import Stats from "./components/Stats";
import Correction from "./components/Correction";
import Login from "./components/Login";

function Router(props) {
    const { children } = props;
    if (typeof window === 'undefined') {
        return <StaticRouter location="/login">{children}</StaticRouter>;
    }

    return (
        <MemoryRouter initialEntries={['/login']} initialIndex={0}>
            {children}
        </MemoryRouter>
    );
}

Router.propTypes = {
    children: PropTypes.node,
};

function useRouteMatch(patterns) {
    const { pathname } = useLocation();

    for (let i = 0; i < patterns.length; i += 1) {
        const pattern = patterns[i];
        const possibleMatch = matchPath(pattern, pathname);
        if (possibleMatch !== null) {
            return possibleMatch;
        }
    }

    return null;
}

function MyTabs(props) {
    // You need to provide the routes in descendant order.
    // This means that if you have nested routes like:
    // users, users/new, users/edit.
    // Then the order should be ['users/add', 'users/edit', 'users'].
    const routeMatch = useRouteMatch(['login', 'current', 'leaderboard', 'stats', 'correction']);
    const currentTab = routeMatch?.pattern?.path;

    return (
        <AppBar position="static" className="navBar" value={currentTab} centered>
            <Container>
                <Toolbar disableGutters>
                    <Tab icon={<Filter8Icon />} to="/OGMonkeLARA" component={Link} disabled={!props.coolKid} />
                    <Tab label="Login" value="login" to="/login" component={Link} icon={<HomeIcon />} />
                    <Tab label="At Lab" value="current" to="/current" component={Link} icon={<PersonIcon />}/>
                    <Tab label="Statistics" value="stats" to="/stats" component={Link} icon={<FunctionsIcon />} disabled={!props.coolKid}/>
                    <Tab label="Corrections" value="correction" to="/correction" component={Link} icon={<FunctionsIcon />} disabled={!props.coolKid}/>
                </Toolbar>
            </Container>
        </AppBar>
    );
}

export default function TabsRouter() {
    const [coolKid, setCoolKid] = useState(false);
    const [loggedIn, setLoggedIn] = useState(false);

    return (
        <div>
            {loggedIn ? (
            <Router>
                <Box sx={{ width: '100%' }}>
                    <MyTabs coolKid={coolKid} />
                    <Routes>
                        <Route path="/OGMonkeLARA" element={<Admin setCoolKid={setCoolKid}/>}/>
                        <Route path="/login" element={<Main setCoolKid={setCoolKid}/>} />
                        <Route path="/current" element={<Current />}/>
                        <Route path="/stats" element={<Stats />} />
                        <Route path="/correction" element={<Correction />} />
                    </Routes>
                </Box>
            </Router>) :(
                <Login login={setLoggedIn} admin={setCoolKid}/>
            )}
        </div>
);
}