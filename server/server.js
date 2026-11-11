
const path = require('path'); 
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer'); 

const app = express();
const PORT = 3000;

// Middleware setup

app.use(bodyParser.json());
app.use(cors()); // To allow cross-origin requests (important for frontend to communicate with backend)

// MySQL database setup
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '', // MySQL password from .env
    database: process.env.DB_NAME || 'cricket'
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
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

// Verify Nodemailer transporter configuration on startup
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    transporter.verify((err, success) => {
        if (err) {
            console.error('⚠️ Nodemailer SMTP configuration error:', err.message);
        } else {
            console.log('✅ Nodemailer SMTP is ready to send emails.');
        }
    });
} else {
    console.warn('⚠️ Nodemailer warning: GMAIL_USER or GMAIL_APP_PASSWORD not set in .env. Login emails cannot be sent until configured.');
}

// Function to send login details email
async function sendLoginEmail(userEmail, username, method = 'Google') {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('⚠️ Cannot send login email: GMAIL_USER or GMAIL_APP_PASSWORD is not configured in .env');
        return;
    }

    const mailOptions = {
        from: '"CRICINFO" <' + process.env.GMAIL_USER + '>', // Sender address
        to: userEmail, // Receiver's email address
        subject: 'Login Notification - CRICINFO', // Email subject
        text: `Hello ${username || 'User'},\n\nYou have successfully logged in to CRICINFO with ${method}.\n\nThanks,\nCRICINFO Team` // Email content
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return info;
    } catch (error) {
        console.error('Error sending email: ', error);
        throw new Error('Failed to send email');
    }
}

// Google login route
app.post('/google-login', (req, res) => {
    const { email, name } = req.body; // Data from Google login
    console.log('Google login data received:', email, name);

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        const proceedWithLogin = (userId) => {
            const loginMethod = 'google';
            db.query('INSERT INTO user_logins (user_id, login_method) VALUES (?, ?)', [userId, loginMethod], (logErr) => {
                if (logErr) {
                    console.error('Error logging user login:', logErr);
                }

                sendLoginEmail(email, name, 'Google')
                    .catch((error) => console.error('Login confirmation email failed:', error.message))
                    .finally(() => {
                        if (!res.headersSent) {
                            res.status(200).json({ message: 'Google login successful', username: name, email });
                        }
                    });
            });
        };

        if (result.length === 0) {
            // Auto-register new user from Google login
            const autoUsername = name || email.split('@')[0];
            db.query('INSERT INTO users (email, username) VALUES (?, ?)', [email, autoUsername], (insertErr, insertResult) => {
                if (insertErr) {
                    console.error('Error auto-registering Google user:', insertErr);
                    return res.status(500).json({ message: 'Database error registering Google user' });
                }
                proceedWithLogin(insertResult.insertId);
            });
        } else {
            proceedWithLogin(result[0].id);
        }
    });
});

// Sign-up route
app.post('/signup', (req, res) => {
    const { email, username, password } = req.body;

    const checkUserQuery = 'SELECT * FROM users WHERE username = ? OR email = ?';
    db.query(checkUserQuery, [username, email], (err, results) => {
        if (err) {
            console.error('Database error checking user:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length > 0) {
            const isEmailTaken = results.some(r => r.email === email);
            return res.status(400).json({
                message: isEmailTaken ? 'Email is already registered' : 'Username is already taken'
            });
        }

        const query = 'INSERT INTO users (email, username, password) VALUES (?, ?, ?)';
        db.query(query, [email, username, password], (insertErr) => {
            if (insertErr) {
                console.error('Database error creating user:', insertErr);
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
            console.error('Database error during login:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (result.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = result[0];
        // Record manual login in user_logins
        db.query('INSERT INTO user_logins (user_id, login_method) VALUES (?, ?)', [user.id, 'manual'], (logErr) => {
            if (logErr) {
                console.error('Error logging user login:', logErr);
            }
        });

        // Send login confirmation email if user has email address
        if (user.email) {
            sendLoginEmail(user.email, user.username, 'Password')
                .catch((error) => console.error('Login confirmation email failed:', error.message));
        }

        res.status(200).json({
            message: 'Login successful',
            username: user.username,
            email: user.email
        });
    });
});

// DELETE Endpoint to Delete User Account
app.delete('/delete-account', (req, res) => {
    const { email, force } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], (err, users) => {
        if (err) {
            console.error('Database error finding user for deletion:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = users[0].id;

        // Check if user has active subscriptions
        db.query('SELECT * FROM subscriptions WHERE user_id = ?', [userId], (subErr, subs) => {
            if (subErr) {
                console.error('Database error checking subscriptions:', subErr);
                return res.status(500).json({ message: 'Database error' });
            }

            if (subs.length > 0 && !force) {
                return res.status(400).json({
                    message: 'Cannot delete user with active subscriptions',
                    hasActiveSubscriptions: true
                });
            }

            // Cleanup subscriptions and subscription logs if forced
            const cleanupSubscriptions = (next) => {
                if (subs.length > 0 && force) {
                    db.query('DELETE FROM subscriptions_log WHERE user_id = ?', [userId], (logErr) => {
                        if (logErr) console.error('Error deleting subscriptions_log:', logErr);
                        db.query('DELETE FROM subscriptions WHERE user_id = ?', [userId], (delSubErr) => {
                            if (delSubErr) {
                                console.error('Error deleting subscriptions:', delSubErr);
                                return next(delSubErr);
                            }
                            next(null);
                        });
                    });
                } else {
                    db.query('DELETE FROM subscriptions_log WHERE user_id = ?', [userId], (logErr) => {
                        if (logErr) console.error('Error deleting subscriptions_log:', logErr);
                        next(null);
                    });
                }
            };

            cleanupSubscriptions((cleanupErr) => {
                if (cleanupErr) {
                    return res.status(500).json({ message: 'Failed to clean up subscriptions' });
                }

                // Delete login history from user_logins to satisfy foreign key constraint
                db.query('DELETE FROM user_logins WHERE user_id = ?', [userId], (loginErr) => {
                    if (loginErr) {
                        console.error('Error deleting user_logins records:', loginErr);
                        return res.status(500).json({ message: 'Error deleting user login records' });
                    }

                    // Delete the user record from users table
                    db.query('DELETE FROM users WHERE id = ?', [userId], (delUserErr, result) => {
                        if (delUserErr) {
                            console.error('Error deleting user:', delUserErr);
                            if (delUserErr.sqlState === '45000' || delUserErr.message.includes('Cannot delete user')) {
                                return res.status(400).json({
                                    message: delUserErr.message,
                                    hasActiveSubscriptions: true
                                });
                            }
                            return res.status(500).json({ message: 'Database error deleting user' });
                        }

                        console.log(`Account deleted successfully for ${email} (ID: ${userId})`);
                        res.status(200).json({ message: 'Account deleted successfully' });
                    });
                });
            });
        });
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



// Function to send payment confirmation email
async function sendPaymentConfirmationEmail(userEmail, cardholderName, amount, plan) {
    const sender = process.env.GMAIL_USER || 'no-reply@cricinfo.com';
    const mailOptions = {
        from: `"CRICINFO" <${sender}>`,
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
