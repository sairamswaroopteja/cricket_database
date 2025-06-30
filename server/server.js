
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path'); 

const app = express();
const PORT = 3000;

// Middleware setup

app.use(bodyParser.json());
app.use(cors()); // To allow cross-origin requests (important for frontend to communicate with backend)

// MySQL database setup
const db = mysql.createConnection({
    host: 'localhost', // Change if you're using a remote DB
    user: 'root', // Your MySQL username
    password: '123', // Your MySQL password
    database: 'cricket' // The name of your database
});

// Connect to the MySQL database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        process.exit(1); // Exit the application if DB connection fails
    }
    console.log('Connected to the MySQL database!');
});

// Setup Nodemailer transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'cse230001023@iiti.ac.in', // Sender's email address
        pass: 'Mahi1307' // Your email password or App Password if 2FA is enabled
    }
});

// Function to send login details email
async function sendLoginEmail(userEmail, username) {
    const mailOptions = {
        from: '"CRICINFO" <cse230001023@iiti.ac.in>', // Sender address
        to: userEmail, // Receiver's email address
        subject: 'Login Details', // Email subject
        text: `Hello ${username},\n\nYou have successfully logged in with Google.\n\nThanks,\nCRICINFO Team` // Email content
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email: ', error);
        throw new Error('Failed to send email');
    }
}

// Google login route
app.post('/google-login', (req, res) => {
    const { email, name } = req.body; // Data from Google login
    console.log('Google login data received:', email, name);

    db.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (result.length === 0) {
            return res.status(400).json({ message: 'User not found' });
        }

        const userId = result[0].id;
        const loginMethod = 'google';
        db.query('INSERT INTO user_logins (user_id, login_method) VALUES (?, ?)', [userId, loginMethod], (err) => {
            if (err) {
                console.error('Error logging user login:', err);
                return res.status(500).json({ message: 'Error logging user login' });
            }

            sendLoginEmail(email, name)
                .then(() => res.status(200).json({ message: 'Google login successful' }))
                .catch((error) => {
                    console.error('Email sending failed:', error);
                    res.status(500).json({ message: 'Failed to send login email' });
                });
        });
    });
});

// Sign-up route
app.post('/signup', (req, res) => {
    const { email, username, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], (err, emailResult) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (emailResult.length > 0) {
            return res.status(400).json({ message: 'Email is already registered' });
        }

        const query = 'INSERT INTO users (email, username, password) VALUES (?, ?, ?)';
        db.query(query, [email, username, password], (err) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }
            res.status(201).json({ message: 'User registered successfully' });
        });
    });
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (result.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        res.status(200).json({
            message: 'Login successful',
            username: result[0].username,
            email: result[0].email
        });
    });
});

// DELETE Endpoint to Delete User Account
app.delete('/delete-account', (req, res) => {
    const { email } = req.body;

    db.query('DELETE FROM users WHERE email = ?', [email], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Account deleted successfully' });
    });
});


// Serve static files (like CSS, JS) from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Dynamic endpoint to get rankings data by format
// Dynamic endpoint to get rankings data by format
app.get('/api/rankings/test', (req, res) => {
    const query = `
        SELECT p.Name AS player_name, t.Team_Name AS team_name, r.Test_Rank AS test_rank
        FROM rankings r
        JOIN player p ON r.Player_Id = p.Player_Id
        JOIN teams t ON p.Team_Id = t.Team_Id
        WHERE r.Test_Rank IS NOT NULL
        ORDER BY r.Test_Rank ASC;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching rankings data:', err.stack);
            res.status(500).send('Error fetching data');
            return;
        }
        res.json(results); // Send rankings data as JSON
    });
});

app.get('/api/rankings/odi', (req, res) => {
    const query = `
        SELECT p.Name AS player_name, t.Team_Name AS team_name, r.Odi_Rank AS odi_rank
        FROM rankings r
        JOIN player p ON r.Player_Id = p.Player_Id
        JOIN teams t ON p.Team_Id = t.Team_Id
        WHERE r.Odi_Rank IS NOT NULL
        ORDER BY r.Odi_Rank ASC;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching rankings data:', err.stack);
            res.status(500).send('Error fetching data');
            return;
        }
        res.json(results); // Send rankings data as JSON
    });
});


app.get('/api/rankings/T20', (req, res) => {
    const query = `
        SELECT p.Name AS player_name, t.Team_Name AS team_name, r.T20_Rank AS t20_rank
        FROM rankings r
        JOIN player p ON r.Player_Id = p.Player_Id
        JOIN teams t ON p.Team_Id = t.Team_Id
        WHERE r.T20_Rank IS NOT NULL
        ORDER BY r.T20_Rank ASC;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching rankings data:', err.stack);
            res.status(500).send('Error fetching data');
            return;
        }
        res.json(results); // Send rankings data as JSON
    });
});

// for schedule
app.get('/api/schedule', (req, res) => {
    const { seriesId, tournamentId } = req.query;

    let query = `
        SELECT 
            m.Match_Id,
            m.Dates,
            m.Timings,
            m.Place,
            m.Score_1,
            m.Score_2,
            m.Winner_Id,
            m.Description,
            m.Status,
            m.Tournament_Id,
            m.Series_Id,
            t1.Team_Name AS TeamA,
            t2.Team_Name AS TeamB
        FROM matches m
        JOIN teams t1 ON m.TeamA_Id = t1.Team_Id
        JOIN teams t2 ON m.TeamB_Id = t2.Team_Id
    `;

    // Add filtering logic based on query parameters
    if (seriesId) {
        query += ` WHERE m.Series_Id = ?`;
    } else if (tournamentId) {
        query += ` WHERE m.Tournament_Id = ?`;
    } else {
        res.status(400).send('Missing seriesId or tournamentId');
        return;
    }

    const param = seriesId || tournamentId;

    db.query(query, [param], (err, results) => {
        if (err) {
            console.error('Error fetching schedule data:', err.stack);
            res.status(500).send('Error fetching schedule data');
            return;
        }
        res.json(results);
    });
});

app.get('/api/series', (req, res) => {
    const query = `
        SELECT 
            m.Series_Id,
            s.Series_Name AS Series_Name,
            s.Format AS Series_Format,
            t1.Team_Name AS TeamA,
            t2.Team_Name AS TeamB,
            COUNT(m.Match_Id) AS NoOfMatches,
            NULL AS Tournament_Id  -- Add a column for Tournament_Id (NULL for series rows)
        FROM matches m
        JOIN teams t1 ON m.TeamA_Id = t1.Team_Id
        JOIN teams t2 ON m.TeamB_Id = t2.Team_Id
        JOIN series s ON m.Series_Id = s.Series_Id
        GROUP BY m.Series_Id, s.Series_Name, s.Format, t1.Team_Name, t2.Team_Name

        UNION ALL

        SELECT 
            NULL AS Series_Id,  -- Keep Series_Id as NULL for tournament rows
            t.Tournament_Name AS Series_Name,
            t.Format AS Series_Format,
            NULL AS TeamA,
            NULL AS TeamB,
            COUNT(m.Match_Id) AS NoOfMatches,
            t.Tournament_Id AS Tournament_Id  -- Add Tournament_Id for tournament rows
        FROM matches m
        JOIN tournament t ON m.Tournament_Id = t.Tournament_Id
        GROUP BY t.Tournament_Id, t.Tournament_Name, t.Format

        ORDER BY Series_Id, Series_Name, TeamA, TeamB;
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching series data:', err.stack);
            res.status(500).send('Error fetching series data');
            return;
        }
        res.json(results); // Send series data as JSON
    });
});

app.get('/api/players/:teamId', (req, res) => {
    const teamId = req.params.teamId; // Extract teamId from the route
    const query = `
        SELECT Name, Batting_Type, Bowling_Type, DOB
        FROM player
        WHERE Team_Id = ?
    `;

    db.query(query, [teamId], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});
app.get('/api/rankings/teams/test', (req, res) => {
    const query = `
        SELECT Team_Name AS team_name, 'Global' AS region, Test_Rank AS test_rank
        FROM teams
        WHERE Test_Rank IS NOT NULL
        ORDER BY Test_Rank ASC;
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching team rankings data:', err.stack);
            res.status(500).send('Error fetching data');
            return;
        }
        res.json(results);
    });
});

app.get('/api/rankings/teams/odi', (req, res) => {
    const query = `
        SELECT Team_Name AS team_name, 'Global' AS region, Odi_Rank AS odi_rank
        FROM teams
        WHERE Odi_Rank IS NOT NULL
        ORDER BY Odi_Rank ASC;
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching team rankings data:', err.stack);
            res.status(500).send('Error fetching data');
            return;
        }
        res.json(results);
    });
});

app.get('/api/rankings/teams/t20', (req, res) => {
    const query = `
        SELECT Team_Name AS team_name, T20_Rank AS t20_rank
        FROM teams
        WHERE T20_Rank IS NOT NULL
        ORDER BY T20_Rank ASC;
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching team rankings data:', err.stack);
            res.status(500).send('Error fetching data');
            return;
        }
        res.json(results);
    });
});

app.post('/signup', (req, res) => {
    const { email, username, password } = req.body;
    console.log('Received signup data:', { email, username, password });

    const checkUserQuery = 'SELECT * FROM users WHERE username = ? OR email = ?';
    db.query(checkUserQuery, [username, email], (err, results) => {
        if (err) {
            console.error('Error checking user:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        const insertUserQuery = 'INSERT INTO users (email, username, password) VALUES (?, ?, ?)';
        db.query(insertUserQuery, [email, username, password], (err, result) => {
            if (err) {
                console.error('Error inserting user:', err);
                return res.status(500).json({ message: 'Error signing up' });
            }
            console.log('User inserted successfully:', result);
            res.status(201).json({ message: 'Signup successful' });
        });
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log('Received login data:', { username, password });

    const loginQuery = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.query(loginQuery, [username, password], (err, results) => {
        if (err) {
            console.error('Error during login:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (results.length > 0) {
            console.log('Login successful for user:', username);
            return res.status(200).json({ message: 'Login successful' });
        } else {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
    });
});

// Function to send payment confirmation email
async function sendPaymentConfirmationEmail(userEmail, cardholderName, amount, plan) {
    const mailOptions = {
        from: '"CRICINFO" <cse230001023@iiti.ac.in>',
        to: userEmail, // Sending email to the user email passed here
        subject: 'Payment Confirmation',
        text: `Dear ${cardholderName},\n\nThank you for subscribing to the ${plan} plan.\nAmount Paid: INR${amount}\n\nWe appreciate your support!\n\nBest regards,\nThe CRICINFO Team`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Payment confirmation email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending payment confirmation email:', error);
    }
}

// Payment subscription route
app.post('/subscribe', (req, res) => {
    const { email, cardholderName, amount, plan } = req.body; // Use cardholderName instead of username

    console.log('Received subscription request:', { email, cardholderName, amount, plan }); // Debugging line

    // Check if the user exists
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
        if (err) {
            console.error('Database error during subscription check:', err); // Error logging
            return res.status(500).json({ message: 'Database error' });
        }

        if (result.length === 0) {
            console.log('User not found'); // Debugging line
            return res.status(400).json({ message: 'User not found' });
        }

        const userId = result[0].id;

        // Insert the subscription details into the database
        db.query(
            'INSERT INTO subscriptions (user_id, plan, amount) VALUES (?, ?, ?)',
            [userId, plan, amount],
            (err) => {
                if (err) {
                    console.error('Failed to record subscription:', err); // Error logging
                    return res.status(500).json({ message: 'Failed to record subscription' });
                }

                // Log before sending email
                console.log(`Sending payment confirmation email to ${email}`);

                // Send payment confirmation email
                sendPaymentConfirmationEmail(email, cardholderName, amount, plan) // Use cardholderName here
                    .then(() => res.status(200).json({ message: 'Subscription successful, email sent!' }))
                    .catch((error) => {
                        console.error('Failed to send email:', error); // Error logging
                        res.status(500).json({ message: 'Subscription successful, but email failed' });
                    });
            }
        );
    });
});

// Route to serve the HTML file
app.get('/rankings', (req, res) => {
    res.sendFile(path.join(__dirname, 'rankings.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
