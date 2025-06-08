const express = require('express');
// const mysql = require('mysql');
const mysql = require('mysql2'); // Assuming you're using MySQL
const cors = require('cors');
const multer = require('multer')
const path = require('path')
const session = require('express-session');
const axios = require('axios');
require('dotenv').config();
const app = express();
const jwt = require('jsonwebtoken');
const { error } = require('console');
const bcrypt = require('bcrypt');
const { getMaxListeners } = require('events');
const cookieParser = require('cookie-parser');
const PORT =process.env.PORT || 5000
// let password;
// let plainPassword ;



// app.use(cors(corsOptions));

// app.use(cors());
app.use(cors({
  origin: 'http://localhost:3000', // frontend URL
  credentials: true
}));
// app.use(express.json());
app.use(cookieParser()); // Use cookie-parser to handle cookies
app.use(express.urlencoded({ extended: true }))

// app.use(session({
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     secure: false,
//     maxAge: 1000 * 60 * 60 * 24
//   }
// }));
app.use(session({
  key:'connect.sid',
  secret: process.env.SESSION_SECRET || 'agri_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true only for HTTPS
    httpOnly: true,
    sameSite: 'lax' // or 'none' if using HTTPS and cross-origin
  }
}));
app.use(express.json());
app.use('/uploads',
  express.static('uploads')
)
// multer setup for img uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');

  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// database detiles
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'agriyama'
});
// db connection
db.connect((error) => {
  if (error) {
    console.log('error while connecting db')
    process.exit(1)
  }
  console.log('db connected')
})

app.get('/', (req, res) => {
  res.send('All agri api hear..')
})
// Add Product route
// app.post('/api/add-product', (req, res) => {
//     upload.single('image'),(req,res)=>{
//         const { name, email, pmobile } = req.body;
//         const image=req.file ? req.file.filename:null

//         if (!name || !email || !pmobile || !image) {
//             return res.status(400).json({ error: 'All fields are required.' });
//         }
//         const sql = "INSERT INTO testt (name, email, pmobile,image) VALUES (?, ?, ?,?)";
//         const Values = [
//             req.body.name,
//             req.body.email,
//             req.body.pmobile,
//             req.body.filename
//         ]
//         db.query(sql, Values, (err, data) => {
//             if (err) {
//                 return res.status(500).json(err); // Send error response
//             }
//             res.status(201).json({ message: 'Product added', data }); // Send success response
//         });
//     }


// })

// All user register post
// app.post('/api/register',(req,res)=>{
//     const {mnumber,email,password} =req.body;

//     if(!mnumber || !email || !password){
//         return res.status(400).json({err:'All fields are required'})
//     }
//     const sql="INSERT INTO users(mnumber,email,password) VALUES (?,?,?)";
//     const values=[mnumber,email,password]
//     db.query(sql,values,(err,data)=>{
//         if(err){
//             return res.status(500).json({err:"Data base error"})
//         }
//         res.status(201).json({message:"data got inserted",data})
//     })
// })

app.post('/api/register', (req, res) => {
  const { mnumber, email, password } = req.body;

  if (!mnumber || !email || !password) {
    return res.status(400).json({ err: 'All fields are required' });
  }

  // Check for existing user
  const checkSql = "SELECT * FROM users WHERE email = ? OR mnumber = ?";
  db.query(checkSql, [email, mnumber], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(500).json({ err: 'Database error during duplication check' });
    }

    if (checkResult.length > 0) {
      return res.status(409).json({ err: 'User with this email or mobile already exists' });
    }

    // If not exists, insert new user
    const insertSql = "INSERT INTO users(mnumber, email, password) VALUES (?, ?, ?)";
    db.query(insertSql, [mnumber, email, password], (err, result) => {
      if (err) {
        return res.status(500).json({ err: 'Database error during insertion' });
      }
      res.status(201).json({ message: 'Registration successful', data: result });
    });
  });
});

// seding otp



app.post('/api/send-otp', async (req, res) => {
  const { mnumber } = req.body;
  if (!mnumber) return res.status(400).json({ error: 'Mobile number is required' });

  try {
    // Add +91 if required by 2Factor setup
    //    const formattedNumber =` mnumber.startsWith('+91') ? mnumber : (+91)${mnumber}`;

    const response = await axios.get(`https://2factor.in/API/V1/0d03d0d2-349e-11f0-8b17-0200cd936042/SMS/${mnumber}/AUTOGEN`);

    console.log("OTP sent to:", mnumber);
    console.log("2Factor response:", response.data);

    res.status(200).json(response.data);
  } catch (error) {
    console.error("OTP sending error:", error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to send OTP', details: error.response?.data || error.message });
  }
});
// verify otp
app.post('/api/verify-otp', async (req, res) => {
  const { session_id, otp } = req.body;
  console.log("session_id:", session_id);
  console.log("OTP:", otp);
  console.log("Request body:", req.body);
  if (!session_id || !otp) return res.status(400).json({ error: 'Session ID and OTP are required' });

  try {
    const response = await axios.get(`https://2factor.in/API/V1/0d03d0d2-349e-11f0-8b17-0200cd936042/SMS/VERIFY/${session_id}/${otp}`);

    console.log("OTP verification response:", response.data);
    res.status(200).json(response.data);
  } catch (error) {
    console.error("OTP verification error:", error.response?.data || error.message);
    res.status(500).json({ error: 'OTP verification failed', details: error.response?.data || error.message });
  }
});


app.post('/forget-password', async (req, res) => {
  const { email } = req.body;
  const query = 'SELECT * FROM users WHERE email = ?';

  connection.query(query, [email], async (err, results) => {
    if (err) return res.status(500).send({ message: 'DB Error' });
    if (results.length === 0) return res.status(404).send({ message: 'Email not found' });

    const mobile = results[0].mnumber;

    try {
      const otpRes = await axios.get(`https://2factor.in/API/V1/0d03d0d2-349e-11f0-8b17-0200cd936042/SMS/${email}/AUTOGEN`);
      res.send({ message: 'OTP sent to your registered mobile number', sessionId: otpRes.data.Details });
    } catch (error) {
      res.status(500).send({ message: 'Failed to send OTP' });
    }
  });
});


app.post('/api/change-password', (req, res) => {
  const { phone, currentPassword, newPassword } = req.body;

  if (!phone || !currentPassword || !newPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const getUserQuery = 'SELECT * FROM users WHERE mnumber = ?';
  db.query(getUserQuery, [phone], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = results[0];
    if (user.password !== currentPassword) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    const updateQuery = 'UPDATE users SET password = ? WHERE mnumber = ?';
    db.query(updateQuery, [newPassword, phone], (err2) => {
      if (err2) {
        return res.status(500).json({ message: 'Error updating password' });
      }

      res.json({ message: 'Password updated successfully' });
    });
  });
});

app.post('/api/update-profile', (req, res) => {
  const { mnumber, name, email } = req.body;

  if (!mnumber || !name || !email) {
    return res.status(400).json({ message: 'All fields required' });
  }

  const updateQuery = `
    UPDATE users 
    SET name = ?, email = ?
    WHERE mnumber = ?
  `;

  db.query(updateQuery, [name, email, mnumber], (err, result) => {
    if (err) {
      console.error('Error updating profile:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully' });
  });
});


// Login route//

// app.post('/api/login', (req, res) => {
//     const { mnumber, password } = req.body;

//     if (!mnumber || !password) {
//         return res.status(400).json({ error: 'Mobile number and password are required' });
//     }

//     const sql = "SELECT * FROM users WHERE mnumber = ? AND password = ?";
//     db.query(sql, [mnumber, password], (err, results) => {
//         if (err) return res.status(500).json({ error: 'Database error' });

//         if (results.length > 0) {
//             // Login success
//             res.status(200).json({ message: 'Login successful', user: results[0] });
//         } else {
//             // Invalid credentials
//             res.status(401).json({ error: 'Invalid mobile number or password' });
//         }
//     });
// });
// app.post('/api/login', (req, res) => {
//   const { identifier, password } = req.body;

//   const query = `
//     SELECT * FROM users
//     WHERE (email = ? OR mnumber = ?) AND password = ?
//   `;

//   db.query(query, [identifier, identifier, password], (err, results) => {
//     if (err) {
//       console.error('Login DB error:', err);
//       return res.status(500).json({ success: false, error: 'Server error' });
//     }

//     if (results.length > 0) {
//       req.session.user = results[0];
//       res.json({ success: true, user: results[0] });
//     } else {
//       res.json({ success: false, message: 'Invalid email/mobile or password' });
//     }
//   });
// });
app.post('/api/login', (req, res) => {
  const { identifier, password } = req.body;

  const query = `
    SELECT * FROM users
    WHERE (email = ? OR mnumber = ?) AND password = ?
  `;

  db.query(query, [identifier, identifier, password], (err, results) => {
    if (err) {
      console.error('Login DB error:', err);
      return res.status(500).json({ success: false, error: 'Server error' });
    }

    if (results.length > 0) {
      req.session.user = results[0];

      // ⬇ Ensure the session is saved before sending response
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ success: false, error: 'Session error' });
        }

        res.json({ success: true, user: results[0] });
      });

    } else {
      res.json({ success: false, message: 'Invalid email/mobile or password' });
    }
  });
});
// api session login
app.get('/api/session', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});
// api/check-session
app.get('/api/check-session', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});
// 
app.get('/api/current-user', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.json({ user: null });
  }
});
// Logout Route
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.clearCookie('connect.sid');
  res.status(200).json({ message: 'Logged out' });
});


app.get('/api/wallet/:userId', (req, res) => {
  const { userId } = req.params;
  const sql = 'SELECT reward_wallet, purchase_wallet FROM user_wallets WHERE user_id = ?';

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (result.length === 0) return res.status(404).json({ error: 'Wallet not found' });

    res.json(result[0]);
  });
});

// admin login route
// app.post('/admin/login', (req, res) => {
//   const { email, password } = req.body;
//   const sql = `SELECT * FROM admin WHERE email = ? AND password = ?`
//   // const query = "SELECT * FROM admin WHERE email = ? AND password = ?";
//   db.query(sql,[email,password],(err,data)=>{
//     if(err){
//         console.error('admin Login DB error:', err);
//       res.status(500).json({success:false,err:"server error"})
//     }
//     if (data.length > 0) {
//       req.session.user = data[0];
//       res.json({ success: true, user: data[0] });
//     } else {
//       res.json({ success: false, message: 'Invalid email/mobile or password' });
//     }
//   })
// })
// const bcrypt = require('bcrypt');
// add new adminlet name ='raja';
let email = 'raja@gmail.com';
let plainPassword = 'Admin@123';
// bcrypt.hash(password, 10,(err,hashedPassword)=>{

//   if(err){
//     console.error('Error hashing password:', err);
//   }else{
//     console.log('Hashed Password ):', hashedPassword);
//   }
// });

// all Routes

// home route

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token; // Assuming you're using cookies to store the token
  if (!token) {
    return res.sendStatus(401); // Unauthorized
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403); // Forbidden
    }
    req.user = user; // Attach user info to the request
    next(); // Proceed to the next middleware or route handler
  });
};

app.post('/api/admin/add', (req, res) => {
  const { name, email, password: plainPassword } = req.body; // Destructure req.body
  // Hash the password
  bcrypt.hash(plainPassword, 10, (err, hashedPassword) => {
    if (err) {
      console.error('❌ Hashing error:', err);
      return res.status(500).json({ message: 'Error hashing password' });
    }
    const sql = "INSERT INTO admin (name, email, password) VALUES (?, ?, ?)";
    db.query(sql, [name, email, hashedPassword], (err, result) => {
      if (err) {
        console.error("❌ Admin insert error:", err);
        return res.status(500).json({ message: 'Error inserting admin' });
      } else {
        console.log("✅ Admin inserted successfully with hashed password!");
        return res.status(201).json({ message: 'Admin added successfully' });
      }
    });
  });
});

// app.post('/api/admin/login', (req, res) => {
//   const { email, password } = req.body;
//   const sql = "SELECT * FROM admin WHERE email = ?";

//   db.query(sql, [email], async (err, data) => {
//     if (err) {
//       console.error('Admin login DB error:', err);
//       return res.status(500).json({ success: false, message: "Server error" });
//     }

//     if (data.length === 0) {
//       return res.json({ success: false, message: 'Invalid email or password' });
//     }

//     const admin = data[0];
//     const isMatch = await bcrypt.compare(password, admin.password);

//     if (isMatch) {
//       req.session.user = admin;
//       return res.json({ success: true, user: admin });
//     } else {
//       return res.json({ success: false, message: 'Invalid email or password' });
//     }
//   });
// });


// server.js
// const orderRoutes = require('./routes/orders');
// app.use('/api', orderRoutes);

// api route
// app.post('/api/add-product', upload.single('image'), (req, res) => {
//     const { pname, price, description, category_id } = req.body;
//     const image = req.file ? req.file.filename : null;

//     if (!pname || !price || !description || !image || !category_id) {
//         return res.status(400).json({ error: 'All fields are required.' });
//     }

//     const sql = "INSERT INTO products (pname, price, description, image, category_id) VALUES (?, ?, ?, ?, ?)";
//     const Values = [pname, price, description, image, category_id];

//     db.query(sql, Values, (err, data) => {
//         if (err) {
//             console.error("Database insert error:", err);
//             return res.status(500).json({ error: 'Database error', details: err.message });
//         }
//         res.status(201).json({ message: 'Product added', data });
//     });
// });
// Add Product route
// app.post('/api/add-product', upload.single('image'), (req, res) => {
//     const { pname, price, description, category_id, delivery_time, available_locations } = req.body;
//     const image = req.file ? req.file.filename : null;

//     if (!pname || !price || !description || !image || !category_id || !delivery_time || !available_locations) {
//         return res.status(400).json({ error: 'All fields are required.' });
//     }

//     const sql = "INSERT INTO products (pname, price, description, image, category_id, delivery_time, available_locations) VALUES (?, ?, ?, ?, ?, ?, ?)";
//     const values = [pname, price, description, image, category_id, delivery_time, available_locations];

//     db.query(sql, values, (err, data) => {
//         if (err) {
//             console.error("Database insert error:", err);
//             return res.status(500).json({ error: 'Database error', details: err.message });
//         }
//         res.status(201).json({ message: 'Product added', data });
//     });
// });

// add products with variants
// API to add product
// app.post('/api/add-product', upload.single('image'), (req, res) => {
//     const { pname, description, category_id, delivery_time, available_locations, variants } = req.body;
//     const image = req.file ? req.file.filename : null;

//     if (!pname || !description || !category_id || !delivery_time || !available_locations || !variants) {
//         return res.status(400).json({ error: "All fields are required." });
//     }

//     let variantsList;
//     try {
//         variantsList = JSON.parse(variants);
//     } catch (e) {
//         return res.status(400).json({ error: "Variants must be a valid JSON array." });
//     }

//     const productSql = "INSERT INTO products (pname, description, category_id, delivery_time, available_locations, image) VALUES (?, ?, ?, ?, ?, ?)";
//     const productValues = [pname, description, category_id, delivery_time, available_locations, image];

//     db.query(productSql, productValues, (err, result) => {
//         if (err) return res.status(500).json({ error: 'Error adding product', details: err.message });

//         const productId = result.insertId;

//         const variantSql = "INSERT INTO product_variants (product_id, quantity,acre, price, old_price,discount,stock) VALUES ?";
//         const variantValues = variantsList.map(v => [
//             productId,

//             v.quantity,
//               v.acre,
//             parseFloat(v.price),
//             parseFloat(v.old_price),
//             v.discount,
//             v.stock,

//         ]);

//         db.query(variantSql, [variantValues], (variantErr) => {
//             if (variantErr) {
//                 console.error("Variant insert error:", variantErr);
//                 return res.status(500).json({ error: 'Error adding variants', details: variantErr.message });
//             }

//             res.status(201).json({ message: 'Product and variants added successfully.' });
//         });
//     });
// });

// addproduct with multiple imges New
// app.post('/api/add-product', upload.array('images', 5), (req, res) => {
//     const { pname, description, category_id, delivery_time,brand, available_locations, variants } = req.body;
//     console.log(req.body)
//     const imageFiles = req.files || [];

//     if (!pname || !description || !category_id  || !delivery_time || !brand || !available_locations || !variants) {
//         return res.status(400).json({ error: "All fields are required." });
//     }

//     let variantsList;
//     try {
//         variantsList = JSON.parse(variants);
//     } catch (e) {
//         return res.status(400).json({ error: "Variants must be a valid JSON array." });
//     }

//     const imageNames = imageFiles.map(file => file.filename);
//     const primaryImage = imageNames[0] || null;

//     const productSql = "INSERT INTO products (pname, description, category_id, delivery_time, brand, available_locations, image) VALUES (?, ?, ?, ?, ?, ?)";
//     const productValues = [pname, description, category_id, delivery_time, brand, available_locations, primaryImage];

//     db.query(productSql, productValues, (err, result) => {
//         if (err) return res.status(500).json({ error: 'Error adding product', details: err.message });

//         const productId = result.insertId;

//         // Insert variants
//         const variantSql = "INSERT INTO product_variants (product_id, quantity, acre, price, old_price, discount, stock) VALUES ?";
//         const variantValues = variantsList.map(v => [
//             productId,
//             v.quantity,
//             v.acre,
//             parseFloat(v.price),
//             parseFloat(v.old_price),
//             v.discount,
//             v.stock
//         ]);

//         db.query(variantSql, [variantValues], (variantErr) => {
//             if (variantErr) {
//                 console.error("Variant insert error:", variantErr);
//                 return res.status(500).json({ error: 'Error adding variants', details: variantErr.message });
//             }

//             // Insert additional images
//             if (imageNames.length > 1) {
//                 const imageSql = "INSERT INTO product_images (product_id, image) VALUES ?";
//                 const imageValues = imageNames.slice(1).map(img => [productId, img]);

//                 db.query(imageSql, [imageValues], (imgErr) => {
//                     if (imgErr) {
//                         console.error("Image insert error:", imgErr);
//                         return res.status(500).json({ error: 'Error adding additional images', details: imgErr.message });
//                     }

//                     return res.status(201).json({ message: 'Product, variants, and images added successfully.' });
//                 });
//             } else {
//                 return res.status(201).json({ message: 'Product and variants added successfully.' });
//             }
//         });
//     });
// });

// app.post('/api/admin/login', (req, res) => {

//     const { email, password } = req.body;

//     // Check for empty fields
//     if (!email || !password) {
//         return res.status(400).json({ message: 'Email and password are required' });
//     }

//     const sql = "SELECT * FROM admin WHERE email = ?";
//     db.query(sql, [email], (err, results) => {
//         if (err) {
//             console.error("❌ Database error:", err);
//             return res.status(500).json({ message: 'Database error' });
//         }

//         if (results.length === 0) {
//             return res.status(401).json({ message: 'Invalid credentials' });
//         }

//         const user = results[0];

//         // Compare the hashed password
//         bcrypt.compare(password, user.password, (err, isMatch) => {
//             if (err) {
//                 console.error("❌ Error comparing passwords:", err);
//                 return res.status(500).json({ message: 'Error during password comparison' });
//             }

//             if (!isMatch) {
//                 return res.status(401).json({ message: 'Invalid credentials' });
//             }

//             // Successful login
//             res.status(200).json({ success: true, user });
//         });
//     });

// });
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const sql = "SELECT * FROM admin WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("❌ Database error:", err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = results[0];

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error("❌ Error comparing passwords:", err);
        return res.status(500).json({ message: 'Error during password comparison' });
      }

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // ✅ Save admin session
      req.session.admin = { id: user.id, email: user.email };

      res.status(200).json({ success: true, admin: req.session.admin });
    });
  });
});

function isAdminLoggedIn(req, res, next) {
  if (req.session && req.session.admin) {
    next(); // Admin is logged in
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized. Please login as admin.' });
  }
}
// Check authentication status
app.get('/api/auth/check', authenticateToken, (req, res) => {
  res.sendStatus(200); // If the middleware passes, the user is authenticated
});
// api/check-session
// app.get('/api/admin/check-session',isAdminLoggedIn, (req, res) => {
//   if (req.session.user) {

//     res.json({ loggedIn: true, user: req.session.user });
//   } else {
//     res.json({ loggedIn: false });
//   }
// });
app.get('/api/admin/check-session', isAdminLoggedIn, (req, res) => {
  if (req.session.admin) {
    console.log(req.session)
    res.json({ loggedIn: true, admin: req.session.admin });
  } else {
    res.status(401).json({ loggedIn: false });
  }
});


// Mangage user api 
app.get('/api/admin/users', (req, res) => {
  const sql = "SELECT * FROM users";
  db.query(sql, (err, data) => {
    if (err) throw err;
    res.json(data)
    console.log(data)
  })
})


app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();

  res.clearCookie('connect.sid');
  res.status(200).json({ message: 'Logged out' });
});

// Create a JWT token
//             const token = jwt.sign({ id: user.id, email: user.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
//             res.cookie('token', token, { httpOnly: true }); // Set the token in a cookie
//             res.status(200).json({ success: true, user });
// app.get('/api/auth/check', authenticateToken, (req, res) => {
//     res.sendStatus(200); // If the middleware passes, the user is authenticated
// });





app.post('/api/add-product', upload.array('images', 5), (req, res) => {
  const { pname, description, category_id, delivery_time, brand, available_locations, variants } = req.body;
  console.log(req.body); // Log the incoming request body
  const imageFiles = req.files || [];

  if (!pname || !description || !category_id || !delivery_time || !brand || !available_locations || !variants) {
    return res.status(400).json({ error: "All fields are required." });
  }

  let variantsList;
  try {
    variantsList = JSON.parse(variants);
  } catch (e) {
    return res.status(400).json({ error: "Variants must be a valid JSON array." });
  }

  const imageNames = imageFiles.map(file => file.filename);
  const primaryImage = imageNames[0] || null;

  const productSql = "INSERT INTO products (pname, description, category_id, delivery_time, brand, available_locations, image) VALUES (?, ?, ?, ?, ?, ?, ?)";
  const productValues = [pname, description, category_id, delivery_time, brand, available_locations, primaryImage];

  console.log("Inserting product with values:", productValues); // Log the values being inserted

  db.query(productSql, productValues, (err, result) => {
    if (err) {
      console.error("Error adding product:", err);
      return res.status(500).json({ error: 'Error adding product', details: err.message });
    }

    const productId = result.insertId;

    // Insert variants
    const variantSql = "INSERT INTO product_variants (product_id, quantity, acre, price, old_price, discount, stock) VALUES ?";
    const variantValues = variantsList.map(v => [
      productId,
      v.quantity,
      v.acre,
      parseFloat(v.price),
      parseFloat(v.old_price),
      v.discount,
      v.stock
    ]);

    db.query(variantSql, [variantValues], (variantErr) => {
      if (variantErr) {
        console.error("Variant insert error:", variantErr);
        return res.status(500).json({ error: 'Error adding variants', details: variantErr.message });
      }

      // Insert additional images
      if (imageNames.length > 1) {
        const imageSql = "INSERT INTO product_images (product_id, image) VALUES ?";
        const imageValues = imageNames.slice(1).map(img => [productId, img]);

        db.query(imageSql, [imageValues], (imgErr) => {
          if (imgErr) {
            console.error("Image insert error:", imgErr);
            return res.status(500).json({ error: 'Error adding additional images', details: imgErr.message });
          }

          return res.status(201).json({ message: 'Product, variants, and images added successfully.' });
        });
      } else {
        return res.status(201).json({ message: 'Product and variants added successfully.' });
      }
    });
  });
});


// Get all products
// app.get('/api/products', (req, res) => {
//     const { category } = req.query;
//     let sql = 'SELECT * FROM products';
//     const values = [];

//     if (category) {
//         sql += ' WHERE category = ?';
//         values.push(category);
//     }

//     sql += ' ORDER BY id DESC';

//     db.query(sql, values, (err, data) => {
//         if (err) {
//             return res.status(500).json({ error: 'Database error', err });
//         }
//         res.status(200).json({ message: 'Products fetched', data });
//     });
// });
// get all products detilesz
// app.get('/api/products', (req, res) => {
//     const { category } = req.query;
//     let sql = `
//         SELECT 
//             p.*, 
//             COALESCE(JSON_ARRAYAGG(
//                 JSON_OBJECT(
//                     'id', pi.id,
//                     'image_name', pi.image_name
//                 )
//             ), JSON_ARRAY()) AS images,
//             COALESCE(JSON_ARRAYAGG(
//                 JSON_OBJECT(
//                     'variant_id', pv.id,
//                     'quantity', pv.quantity,
//                     'acre', pv.acre,
//                     'price', pv.price,
//                     'old_price', pv.old_price,
//                     'discount', pv.discount,
//                     'stock', pv.stock
//                 )
//             ), JSON_ARRAY()) AS variants
//         FROM products p
//         LEFT JOIN product_images pi ON p.id = pi.product_id
//         LEFT JOIN product_variants pv ON p.id = pv.product_id
//     `;

//     const values = [];

//     if (category) {
//         sql += ' WHERE p.category = ?';
//         values.push(category);
//     }

//     sql += ' GROUP BY p.id ORDER BY p.id DESC';

//     db.query(sql, values, (err, data) => {
//         if (err) {
//             return res.status(500).json({ error: 'Database error', err });
//         }
//         res.status(200).json({ message: 'Products with images and variants fetched', data });
//     });
// });

// new products get method working
// app.get('/api/products', (req, res) => {
//   const { category } = req.query;

//   let sql = `
//     SELECT 
//       p.id AS product_id,
//       p.pname,
//       p.description,
//       p.category_id,
//       p.delivery_time,
//       p.available_locations,
//       pi.id AS image_id,
//       pi.images AS image,
//       pv.id AS variant_id,
//       pv.quantity,
//       pv.acre,
//       pv.price,
//       pv.old_price,
//       pv.discount,
//       pv.stock
//     FROM products p
//     LEFT JOIN product_images pi ON p.id = pi.product_id
//     LEFT JOIN product_variants pv ON p.id = pv.product_id
//   `;

//   const values = [];

//   if (category) {
//     sql += ' WHERE p.category_id = ?'; // Update this if necessary
//     values.push(category);
//   }

//   sql += ' ORDER BY p.id DESC';

//   db.query(sql, values, (err, data) => {
//     if (err) {
//       console.error("Database error:", err);
//       return res.status(500).json({ error: 'Database error', details: err.message });
//     }

//     // Aggregate images and variants by product
//     const productsMap = new Map();

//     data.forEach(row => {
//       if (!productsMap.has(row.product_id)) {
//         productsMap.set(row.product_id, {
//           id: row.product_id,
//           pname: row.pname,
//           description: row.description,
//           category_id: row.category_id,
//           delivery_time: row.delivery_time,
//           available_locations: row.available_locations,
//           images: [],
//           variants: []
//         });
//       }
//       const product = productsMap.get(row.product_id);

//       if (row.image_id && !product.images.find(img => img.id === row.image_id)) {
//         product.images.push({
//           id: row.image_id,
//           image_name: row.image
//         });
//       }
//       if (row.variant_id && !product.variants.find(v => v.variant_id === row.variant_id)) {
//         product.variants.push({
//           variant_id: row.variant_id,
//           quantity: row.quantity,
//           acre: row.acre,
//           price: parseFloat(row.price),
//           old_price: parseFloat(row.old_price),
//           discount: row.discount,
//           stock: row.stock
//         });
//       }
//     });

//     const productsArray = Array.from(productsMap.values());

//     res.status(200).json({ message: 'Products with image and variants fetched', data: productsArray });
//   });
// });



// final work
// app.get('/api/products', (req, res) => {
//   const { category } = req.query;

//   let sql = `  
//     SELECT   
//       p.id AS product_id,  
//       p.pname,  
//       p.description,  
//       p.category_id,  
//       p.delivery_time,  
//       p.available_locations,  
//       pi.id AS image_id,  
//       c.name AS category,
//       pi.image AS image,  
//       pv.id AS variant_id,  
//       pv.quantity,  
//       pv.acre,  
//       pv.price,  
//       pv.old_price,  
//       pv.discount,  
//       pv.stock  
//     FROM products p  
//     LEFT JOIN categories c ON p.category_id = c.id  
//     LEFT JOIN product_images pi ON p.id = pi.product_id  
//     LEFT JOIN product_variants pv ON p.id = pv.product_id  
//   `;

//   const values = [];

//   if (category) {
//     sql += ' WHERE p.category_id = ?';
//     values.push(category);
//   }

//   sql += ' ORDER BY p.id DESC';
//   //  sql += ' ORDER BY p.created_at DESC';

//   db.query(sql, values, (err, data) => {
//     if (err) {
//       console.error("Database error:", err);
//       return res.status(500).json({ error: 'Database error', details: err.message });
//     }

//     const productsMap = new Map();

//     data.forEach(row => {
//       if (!productsMap.has(row.product_id)) {
//         productsMap.set(row.product_id, {
//           id: row.product_id,
//           pname: row.pname,
//           description: row.description,
//           category_id: row.category_id,
//           category: row.category,
//           delivery_time: row.delivery_time,
//           available_locations: row.available_locations,
//           images: [],
//           variants: []
//         });
//       }
//       const product = productsMap.get(row.product_id);

//       if (row.image_id && !product.images.find(img => img.id === row.image_id)) {
//         product.images.push({
//           id: row.image_id,
//           image_name: row.image  // FIXED this line  
//         });
//       }
//       if (row.variant_id && !product.variants.find(v => v.variant_id === row.variant_id)) {
//         product.variants.push({
//           variant_id: row.variant_id,
//           quantity: row.quantity,
//           acre: row.acre,
//           price: parseFloat(row.price),
//           old_price: parseFloat(row.old_price),
//           discount: row.discount,
//           stock: row.stock
//         });
//       }
//     });

//     const productsArray = Array.from(productsMap.values());

//     res.status(200).json({ message: 'Products with images and variants fetched', data: productsArray });
//   });
// });

const dayjs = require('dayjs'); // Use dayjs for date comparisons (npm install dayjs)

app.get('/api/products', (req, res) => {
  const { category } = req.query;

  let sql = `  
    SELECT   
      p.id AS product_id,  
      p.pname,  
      p.description,  
      p.category_id,  
      p.delivery_time,  
      p.available_locations,  
      p.created_at,
      pi.id AS image_id,  
      c.name AS category,
      pi.image AS image,  
      pv.id AS variant_id,  
      pv.quantity,  
      pv.acre,  
      pv.price,  
      pv.old_price,  
      pv.discount,  
      pv.stock  
    FROM products p  
    LEFT JOIN categories c ON p.category_id = c.id  
    LEFT JOIN product_images pi ON p.id = pi.product_id  
    LEFT JOIN product_variants pv ON p.id = pv.product_id  
  `;

  const values = [];

  if (category) {
    sql += ' WHERE p.category_id = ?';
    values.push(category);
  }

  sql += ' ORDER BY p.created_at DESC';

  db.query(sql, values, (err, data) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    const productsMap = new Map();

    const now = dayjs();

    data.forEach(row => {
      if (!productsMap.has(row.product_id)) {
        const createdAt = dayjs(row.created_at);
        const isNew = now.diff(createdAt, 'day') <= 7;

        productsMap.set(row.product_id, {
          id: row.product_id,
          pname: row.pname,
          description: row.description,
          category_id: row.category_id,
          category: row.category,
          delivery_time: row.delivery_time,
          available_locations: row.available_locations,
          created_at: row.created_at,
          isNew: true,// ✅ Mark as "new" if added within last 7 days
          images: [],
          variants: []
        });
      }

      const product = productsMap.get(row.product_id);

      if (row.image_id && !product.images.find(img => img.id === row.image_id)) {
        product.images.push({
          id: row.image_id,
          image_name: row.image
        });
      }

      if (row.variant_id && !product.variants.find(v => v.variant_id === row.variant_id)) {
        product.variants.push({
          variant_id: row.variant_id,
          quantity: row.quantity,
          acre: row.acre,
          price: parseFloat(row.price),
          old_price: parseFloat(row.old_price),
          discount: row.discount,
          stock: row.stock
        });
      }
    });

    const productsArray = Array.from(productsMap.values());

    res.status(200).json({ message: 'Products with images and variants fetched', data: productsArray });
  });
});


// app.get('/api/products', (req, res) => {
//   const { category } = req.query;

//   let sql = `  
//     SELECT   
//       p.id AS product_id,  
//       p.pname,  
//       p.description,  
//       p.category_id,  
//       p.delivery_time,  
//       p.available_locations,  
//       pi.id AS image_id,  
//       c.name AS category,
//       pi.image AS image,  
//       pv.id AS variant_id,  
//       pv.quantity,  
//       pv.acre,  
//       pv.price,  
//       pv.old_price,  
//       pv.discount,  
//       pv.stock  
//     FROM products p  
//     LEFT JOIN categories c ON p.category_id = c.id  
//     LEFT JOIN product_images pi ON p.id = pi.product_id  
//     LEFT JOIN product_variants pv ON p.id = pv.product_id  
//   `;

//   const values = [];

//   if (category) {
//     sql += ' WHERE p.category_id = ?';
//     values.push(category);
//   }

//   sql += ' ORDER BY p.id DESC';

//   db.query(sql, values, (err, data) => {
//     if (err) {
//       console.error("Database error:", err);
//       return res.status(500).json({ error: 'Database error', details: err.message });
//     }

//     const productsMap = new Map();

//     data.forEach(row => {
//       if (!productsMap.has(row.product_id)) {
//         productsMap.set(row.product_id, {
//           id: row.product_id,
//           pname: row.pname,
//           description: row.description,
//           category_id: row.category_id,
//           category: row.category,
//           delivery_time: row.delivery_time,
//           available_locations: row.available_locations,
//           images: [],
//           variants: []
//         });
//       }
//       const product = productsMap.get(row.product_id);

//       if (row.image_id && !product.images.find(img => img.id === row.image_id)) {
//         product.images.push({
//           id: row.image_id,
//           image_name: row.image
//         });
//       }

//       // ✅ FIXED LINE BELOW: changed v.variant_id → v.id to match actual data structure
//       if (row.variant_id && !product.variants.find(v => v.variant_id === row.variant_id)) {
//         product.variants.push({
//           variant_id: row.variant_id,
//           quantity: row.quantity,
//           acre: row.acre,
//           price: parseFloat(row.price),
//           old_price: parseFloat(row.old_price),
//           discount: row.discount,
//           stock: row.stock
//         });
//       }
//     });

//     const productsArray = Array.from(productsMap.values());

//     res.status(200).json({ message: 'Products with images and variants fetched', data: productsArray });
//   });
// });
// app.get('/api/products', (req, res) => {
//   const { category } = req.query;

//   let sql = `
//     SELECT   
//       p.id AS product_id,  
//       p.pname,  
//       p.description,  
//       p.category_id,  
//       p.delivery_time,  
//       p.available_locations,  
//       c.name AS category,
//       pi.id AS image_id,  
//       pi.image AS image,  
//       pi.variant_id,  
//       pv.id AS variant_id,  
//       pv.quantity,  
//       pv.acre,  
//       pv.price,  
//       pv.old_price,  
//       pv.discount,  
//       pv.stock  
//     FROM products p  
//     LEFT JOIN categories c ON p.category_id = c.id  
//     LEFT JOIN product_variants pv ON p.id = pv.product_id  
//     LEFT JOIN product_images pi ON pv.id = pi.variant_id
//   `;

//   const values = [];

//   if (category) {
//     sql += ' WHERE p.category_id = ?';
//     values.push(category);
//   }

//   sql += ' ORDER BY p.id DESC';

//   db.query(sql, values, (err, data) => {
//     if (err) {
//       console.error("Database error:", err);
//       return res.status(500).json({ error: 'Database error', details: err.message });
//     }

//     const productsMap = new Map();

//     data.forEach(row => {
//       if (!productsMap.has(row.product_id)) {
//         productsMap.set(row.product_id, {
//           id: row.product_id,
//           pname: row.pname,
//           description: row.description,
//           category_id: row.category_id,
//           category: row.category,
//           delivery_time: row.delivery_time,
//           available_locations: row.available_locations,
//           images: [],
//           variants: []
//         });
//       }

//       const product = productsMap.get(row.product_id);

//       // Add variant if not already added
//       if (row.variant_id && !product.variants.find(v => v.variant_id === row.variant_id)) {
//         product.variants.push({
//           variant_id: row.variant_id,
//           quantity: row.quantity,
//           acre: row.acre,
//           price: parseFloat(row.price),
//           old_price: parseFloat(row.old_price),
//           discount: row.discount,
//           stock: row.stock,
//           image: row.image || null // attach image if exists
//         });
//       } else if (row.variant_id) {
//         // Add or update image for variant if exists
//         const variant = product.variants.find(v => v.variant_id === row.variant_id);
//         if (variant && row.image) {
//           variant.image = row.image;
//         }
//       }
//     });

//     const productsArray = Array.from(productsMap.values());

//     res.status(200).json({ message: 'Products with images and variants fetched', data: productsArray });
//   });
// });
// update products
app.put('/api/update-variant/:id', upload.single('image'), async (req, res) => {
  const { price, quantity } = req.body;
  const image = req.file?.filename;

  const updateQuery = `
    UPDATE product_variants 
    SET price = ?, quantity = ?${image ? ', image = ?' : ''} 
    WHERE id = ?
  `;

  const params = image ? [price, quantity, image, req.params.id] : [price, quantity, req.params.id];

  // execute update query
});
// Update product variant without using URL param
// Expects JSON body: { id: number/string, price: number, quantity: number }
// app.put('/api/update-variant', (req, res) => {
//   const { id, price, quantity } = req.body;
//   if (!id) {
//     return res.status(400).json({ error: 'Missing variant id in request body' });
//   }
//   if (price === undefined || quantity === undefined) {
//     return res.status(400).json({ error: 'Missing price or quantity in request body' });
//   }
//   const sql = 'UPDATE product_variants SET price = ?, quantity = ? WHERE id = ?';
//   db.query(sql, [price, quantity, id], (err, result) => {
//     if (err) {
//       return res.status(500).json({ error: 'Database error', err });
//     }
//     if (result.affectedRows === 0) {
//       return res.status(404).json({ error: 'Variant not found' });
//     }
//     res.status(200).json({ message: 'Product variant updated successfully' });
//   });
// });
// Delete product variant without using URL param
// Expects JSON body: { id: number/string }
app.delete('/api/delete-variant', (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Missing variant id in request body' });
  }
  const sql = 'DELETE FROM product_variants WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }
    res.status(200).json({ message: 'Product variant deleted successfully' });
  });
});
app.put('/api/update-variant/:id', upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { quantity, price } = req.body;
  let sql;
  let values;

  if (req.file) {
    // If image uploaded, update quantity, price, and image
    sql = 'UPDATE product_variants SET quantity = ?, price = ?, image = ? WHERE id = ?';
    values = [quantity, price, req.file.filename, id];
  } else {
    // No image uploaded, update only quantity and price
    sql = 'UPDATE product_variants SET quantity = ?, price = ? WHERE id = ?';
    values = [quantity, price, id];
  }

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('DB update error:', err);
      return res.status(500).json({ error: 'Database error', err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }
    res.json({ message: 'Variant updated successfully' });
  });
});
// app.delete('/api/delete-variant/:id', (req, res) => {
//     const { id } = req.params;
//     console.log(id)
//     const sql = "DELETE FROM product_variants WHERE id = ?";
//     db.query(sql, [id], (err, result) => {
//         if (err) {
//             return res.status(500).json({ error: 'Database error', err });
//         }
//         if (result.affectedRows === 0) {
//             return res.status(404).json({ error: 'Variant not found' });
//         }
//         res.status(200).json({ message: 'Product variant deleted successfully' });
//     });
// });



// Categories get method
app.post('/api/add-category', upload.single('cat_img'), (req, res) => {
  const { name, cat_des } = req.body;
  const cat_img = req.file ? req.file.filename : null;

  if (!name || !cat_des || !cat_img) {
    return res.status(400).json({ error: 'Name, description, and image are required' });
  }

  const sql = "INSERT INTO categories(name, cat_des, cat_img) VALUES (?, ?, ?)";
  const values = [name, cat_des, cat_img];

  db.query(sql, values, (err, data) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err });
    } else {
      res.status(201).json({ message: 'Category added successfully', data });
    }
  });
});
// Get all categories
// app.get('/api/categories', (req, res) => {
//     const sql = "SELECT * FROM categories"
//     console.log(sql)
//     db.query(sql, (err, data) => {
//         if (err) {
//             return res.status(500).json({ error: 'Database error', err });
//         }
//         res.status(200).json({ message: 'Orders fetched successfully', data });
//     })
// })
// get all categories
app.get('/api/categories', (req, res) => {
  const sql = "SELECT * FROM categories";
  db.query(sql, (err, data) => {
    if (err) return res.json({ error: err });
    res.json(data);
    console.log(data)
  });
});
// all categories delete
app.delete('/api/delete-categories/:id', (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM categories WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', err });
    }
    res.status(200).json({ message: 'cat deleted successfully' });
  });
});
// app.put('/api/update-categories/:id', (req, res) => {
//     const { name, cat_des } = req.body;
//     const id = req.params.id;
// console.log(req.body)
//     console.log("Received data:", { name, cat_des,   id });

//     const sql = "UPDATE products SET name = ?, cat_des = ?,  WHERE id = ?";
//     const values = [name,  cat_des,  id];

//     db.query(sql, values, (err, result) => {
//         if (err) {
//             console.error("Database error:", err);
//             return res.status(500).json({ error: 'Database error', err });
//         }
//         if (result.affectedRows === 0) {
//             return res.status(404).json({ error: 'Product not found' });
//         }
//         res.json({ message: 'Product updated successfully' });
//     });
// });
// Update product endpoint with image upload support
app.put('/api/update-categories/:id', upload.single('cat_img'), (req, res) => {
  console.log(req)
  const { id } = req.params;
  const { name, cat_des } = req.body;
  let sql;
  let values;
  if (req.file) {
    // If image uploaded, update img path also
    sql = 'UPDATE categories SET name = ?, cat_des = ?, cat_img = ? WHERE id = ?';
    values = [name, cat_des, req.file.filename, id];
  } else {
    // No image uploaded
    sql = 'UPDATE categories SET name = ?, cat_des = ? WHERE id = ?';
    values = [name, cat_des, id];
  }
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('DB update error:', err);
      return res.status(500).json({ error: 'Database error', err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'categories not found' });
    }
    res.json({ message: 'categories updated successfully' });
  });
});

// mange all silders api

app.post('/api/add-slider', upload.single('slider_img'), (req, res) => {
  const { title, description } = req.body
  const slider_img = req.file ? req.file.filename : null
  if (!title || !description || !slider_img) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  const sql = "INSERT INTO slider(title, description, slider_img) VALUES(?, ?, ?)";
  const values = [title, description, slider_img]


  db.query(sql, values, (err, data) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err });
    } else {
      res.status(201).json({ message: 'Slider added successfully', data });
    }
  })

})
// get all silders
app.get('/api/slides', (req, res) => {
  const sql = "SELECT * FROM slider";
  db.query(sql, (err, data) => {
    if (err) return res.json({ error: err });
    res.json(data);
  });
});
// Add delete route 
app.delete('/api/delete-product/:id', (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM products WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(200).json({ message: 'Product deleted successfully' });
  });
});
// product update
// Update product
app.put('/api/update-product/:id', (req, res) => {
  const { pname, price, description, } = req.body;
  const id = req.params.id;

  console.log("Received data:", { pname, price, description, id });

  const sql = "UPDATE products SET pname = ?, price = ?, description = ?,  WHERE id = ?";
  const values = [pname, price, description, id];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: 'Database error', err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product updated successfully' });
  });
});
app.get('/api/total-products', (req, res) => {
  const sql = "SELECT COUNT(*) AS total FROM products";
  db.query(sql, (err, data) => {
    if (err) return res.json({ error: err });
    res.json(data[0]); // Assuming data[0].total contains the count
  });
});





// app.get('/api/total-users', (req, res) => {
//     const sql = "SELECT COUNT(*) AS total FROM users";
//     db.query(sql, (err, data) => {
//         if (err) return res.json({ error: err });
//         res.json(data[0]); // Assuming data[0].total contains the count
//     });
// });

// app.get('/api/total-orders', (req, res) => {
//     const sql = "SELECT COUNT(*) AS total FROM orders";
//     db.query(sql, (err, data) => {
//         if (err) return res.json({ error: err });
//         res.json(data[0]); // Assuming data[0].total contains the count
//     });
// });









// Total users
app.get('/api/stats/total-users', (req, res) => {
  db.query('SELECT COUNT(*) AS total FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

// Users joined today
app.get('/api/total-users-today', (req, res) => {
  db.query(`SELECT COUNT(*) AS total FROM users WHERE DATE(created_at) = CURDATE()`, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

// Total orders
app.get('/api/stats/total-orders', (req, res) => {
  db.query('SELECT COUNT(*) AS total FROM orders', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

// Orders today 
app.get('/api/stats/orders-today', (req, res) => {
  db.query(`SELECT COUNT(*) AS total FROM orders WHERE DATE(order_date) = CURDATE()`, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});
// total orders-cancelled
app.get('/api/stats/orders-cancelled', (req, res) => {
  const query = `SELECT COUNT(*) AS total FROM orders WHERE order_status = 'Cancelled'`;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});
// total category
app.get('/api/stats/total-category', (req, res) => {
  const query = 'SELECT COUNT(*) AS total FROM categories ';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});
// total slide
app.get('/api/stats/total-slide', (req, res) => {
  const query = 'SELECT COUNT(*) AS total FROM slider ';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

// Total products
app.get('/api/stats/total-products', (req, res) => {
  db.query('SELECT COUNT(*) AS total FROM products', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

// Products added today
app.get('/api/products-today', (req, res) => {
  db.query(`SELECT COUNT(*) AS total FROM products WHERE DATE(created_at) = CURDATE()`, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});



// old place order
// app.post('/api/place-order', (req, res) => {
//     const { name, mobile, address, payment, cartItems } = req.body;

//     const total = cartItems.reduce((sum, item) => sum + item.price, 0);

//     const orderSql = "INSERT INTO orders (name, mobile, address, payment_method, total_amount) VALUES (?, ?, ?, ?, ?)";
//     const orderValues = [name, mobile, address, payment, total];

//     db.query(orderSql, orderValues, (err, orderResult) => {
//         if (err) return res.status(500).json({ error: "Failed to place order", err });

//         const orderId = orderResult.insertId;

//         const itemsSql = "INSERT INTO order_items (order_id, product_id, pname, price) VALUES ?";
//         const itemValues = cartItems.map(item => [orderId, item.id, item.pname, item.price]);

//         db.query(itemsSql, [itemValues], (err2) => {
//             if (err2) return res.status(500).json({ error: "Failed to save items", err2 });

//             res.status(200).json({ message: "Order placed successfully", orderId });
//         });
//     });
// });

// new place order
// app.post('/api/place-order', (req, res) => {
//     const { name, mobile, address, payment, cartItems } = req.body;

//     const total = cartItems.reduce((sum, item) => sum + item.price, 0);

//     const orderSql = "INSERT INTO orders (name, mobile, address, payment_method, total_amount) VALUES (?, ?, ?, ?, ?)";
//     const orderValues = [name, mobile, address, payment, total];

//     db.query(orderSql, orderValues, (err, orderResult) => {
//         if (err) return res.status(500).json({ error: "Failed to place order", err });

//         const orderId = orderResult.insertId;

//         // Now also insert variant_id
//         const itemsSql = "INSERT INTO order_items (order_id, product_id, variant_id, pname, price) VALUES ?";
//         const itemValues = cartItems.map(item => [
//             orderId,
//             item.id,
//             item.variant_id,   // Ensure this exists in your cartItems
//             item.pname,
//             item.price
//         ]);

//         db.query(itemsSql, [itemValues], (err2) => {
//             if (err2) return res.status(500).json({ error: "Failed to save items", err2 });

//             res.status(200).json({ message: "Order placed successfully", orderId });
//         });
//     });
// });
// app.post('/api/orders', (req, res) => {
//   const {
//     customer,
//     items,
//     totalAmount,
//     paymentMethod
//   } = req.body;

//   const { name, phone, address, city, state, pin } = customer;

//   const orderQuery = `
//     INSERT INTO orders (customer_name, phone, address, city, state, pin, total_amount, payment_method)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//   `;

//   db.query(orderQuery, [name, phone, address, city, state, pin, totalAmount, paymentMethod], (err, result) => {
//     if (err) {
//       console.error('Order insert error:', err);
//       return res.status(500).json({ message: 'Failed to place order' });
//     }

//     const orderId = result.insertId;

//     const itemValues = items.map(item => [
//       orderId,
//       item.id,
//       item.selectedVariant?.id || null,
//       item.quantity,
//       item.selectedVariant?.price || 0
//     ]);

//     const itemQuery = `
//       INSERT INTO order_items (order_id, product_id, variant_id, quantity, price)
//       VALUES ?
//     `;

//     db.query(itemQuery, [itemValues], (err2) => {
//       if (err2) {
//         console.error('Order items insert error:', err2);
//         return res.status(500).json({ message: 'Failed to save order items' });
//       }

//       return res.json({ message: 'Order placed successfully', orderId });
//     });
//   });
// });
// another api added 
// app.post('/api/place-orders', (req, res) => {
//   const {
//     customer,
//     items,
//     total_amount,
//     paymentMethod
//   } = req.body;

//   if (!customer) {
//     return res.status(400).json({ message: 'Customer details are required' });
//   }

//   const { name, phone, address, city, state, pin } = customer;
//   console.log(req.body)

//   const orderQuery = `
//      INSERT INTO orders (name, phone, address, city, state, pin, total_amount, payment_method)
//   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
// `;

// db.query(orderQuery, [name || null, phone || null, address || null, city || null, state || null, pin || null, total_amount || 0, paymentMethod || 'COD'], (err, result) => {
//     if (err) {
//       console.error('Order insert error:', err);
//       return res.status(500).json({ message: 'Failed to place order' });
//     }

//     const orderId = result.insertId;

//     const itemValues = items.map(item => [
//       orderId,
//       item.id,
//       item.selectedVariant?.id || null,
//       item.quantity,
//       item.selectedVariant?.price || 0
//     ]);

//     const itemQuery = `
//       INSERT INTO order_items (order_id, product_id, variant_id, quantity, price)
//       VALUES ?
//     `;

//     db.query(itemQuery, [itemValues], (err2) => {
//       if (err2) {
//         console.error('Order items insert error:', err2);
//         return res.status(500).json({ message: 'Failed to save order items' });
//       }

//       return res.json({ message: 'Order placed successfully', orderId });
//     });
//   });
// });


app.post('/api/place-orders', (req, res) => {
  console.log(req.body)
  const {
    customer,
    items,
    totalAmount,
    paymentMethod,
    coupon,
    discount
  } = req.body;

  if (!customer) {
    return res.status(400).json({ message: 'Customer details are required' });
  }

  const { name, phone, address, city, state, pin } = customer;

  const orderQuery = `
     INSERT INTO orders (name, phone, address, city, state, pin, total_amount, payment_method,coupon_code,discount_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?,?,?)
  `;

  db.query(orderQuery, [
    name || null,
    phone || null,
    address || null,
    city || null,
    state || null,
    pin || null,
    totalAmount || 0,
    paymentMethod || 'COD',
    coupon || null,
    discount || 0
  ], (err, result) => {
    if (err) {
      console.error('Order insert error:', err);
      return res.status(500).json({ message: 'Failed to place order' });
    }

    const orderId = result.insertId;

    const itemValues = items.map(item => [
      orderId,
      item.pname || null,
      item.product_id || null,
      item.variant_id || null,
      item.quantity || 1,
      item.price || 0  // Optional, only if price is included
    ]);

    const itemQuery = `
      INSERT INTO order_items (order_id,pname, product_id, variant_id, quantity, price)
      VALUES ?
    `;

    db.query(itemQuery, [itemValues], (err2) => {
      if (err2) {
        console.error('Order items insert error:', err2);
        return res.status(500).json({ message: 'Failed to save order items' });
      }

      return res.json({ message: 'Order placed successfully', orderId });
    });
  });
});

// get orders
app.get('/api/orders', (req, res) => {
  const sql = "SELECT * FROM orders"
  console.log(sql)
  db.query(sql, (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', err });
    }
    res.status(200).json({ message: 'Orders fetched successfully', data });
  })
})

app.post('/api/send-order-sms', async (req, res) => {
  let { mobile, name, orderId, totalAmount } = req.body;

  if (!mobile || !name || !orderId || !totalAmount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const message = `Hi ${name}, your order #${orderId} of ₹${totalAmount} has been placed successfully. Thank you for shopping with us!`;

  try {
    const response = await axios.get(
      `https://2factor.in/API/V1/0d03d0d2-349e-11f0-8b17-0200cd936042/SMS/${mobile}/${encodeURIComponent(message)}`
    );

    return res.json({ success: true, data: response.data });
  } catch (err) {
    console.error("SMS sending failed:", err.response?.data || err.message);
    return res.status(500).json({ success: false, error: "Failed to send SMS" });
  }
});

// app.get('/api/orders/:orderId', (req, res) => {
//   const orderId = req.params.id;

//   const sql = `
//     SELECT o.*, oi.product_id, oi.quantity, oi.price, p.pname, pi.image_name AS image
//     FROM orders o
//     JOIN order_items oi ON o.id = oi.order_id
//     JOIN products p ON p.id = oi.product_id
//     LEFT JOIN product_images pi ON pi.product_id = p.id
//     WHERE o.id = ?
//   `;

//   db.query(sql, [orderId], (err, results) => {
//     if (err) return res.status(500).json({ error: "DB error" });

//     if (results.length === 0) return res.status(404).json({ message: "Order not found" });

//     const order = {
//       id: results[0].id,
//       total_amount: results[0].total_amount,
//       coupon: results[0].coupon_code,
//       discount: results[0].discount_amount,
//       items: results.map(row => ({
//         product_id: row.product_id,
//         pname: row.pname,
//         quantity: row.quantity,
//         price: row.price,
//         image: row.image,
//       })),
//     };

//     res.json(order);
//   });
// });
app.get('/api/order/:orderId', (req, res) => {
  const orderId = req.params.orderId;

  const orderQuery = 'SELECT * FROM orders WHERE id = ?';
  const itemQuery = `
    SELECT oi.*, p.pname, pi.image
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    LEFT JOIN product_images pi ON p.id = pi.product_id
    WHERE oi.order_id = ?
    GROUP BY oi.id
  `;

  db.query(orderQuery, [orderId], (err, orderResult) => {
    if (err) return res.status(500).json({ error: 'Order query failed' });
    if (orderResult.length === 0) return res.status(404).json({ error: 'Order not found' });

    db.query(itemQuery, [orderId], (err, itemResult) => {
      if (err) return res.status(500).json({ error: 'Items query failed' });

      res.json({
        order: orderResult[0],
        items: itemResult
      });
    });
  });
});
app.post('/api/orders/rating', (req, res) => {
  const { order_id, rating } = req.body;

  const sql =" UPDATE orders SET rating = ? WHERE id = ?";

  db.query(sql, [rating, order_id], (err) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json({ message: "Rating submitted" });
  });
});
// update order its working fine 100%
// app.put('/update-order/:id', (req, res) => {
//     const orderId = req.params.id;
//     const { name, phone, address, payment_method, payment_status, total_amount } = req.body;

//     const sql = `
//         UPDATE orders SET 
//             name = ?, 
//             phone = ?, 
//             address = ?, 
//             payment_method = ?, 
//             payment_status = ?, 
//             total_amount = ?
//         WHERE id = ?
//     `;

//     db.query(sql, [name, phone, address, payment_method, payment_status, total_amount, orderId], (err, result) => {
//         if (err) {
//             console.error('Error updating order:', err);
//             return res.status(500).json({ error: 'Update failed' });
//         }
//         return res.json({ message: 'Order updated successfully' });
//     });
// });
// secound update 200% working with order status update
app.post('/api/submit-rating', (req, res) => {
  const { order_id, product_id, rating, review } = req.body;
  const sql = `
    UPDATE order_items 
    SET rating = ?, review = ?
    WHERE order_id = ? AND product_id = ?
  `;
  db.query(sql, [rating, review, order_id, product_id], (err) => {
    if (err) {
      console.error("Error updating rating:", err);
      return res.status(500).json({ error: "Failed to update rating" });
    }
    res.json({ success: true });
  });
});
// working..
app.delete('/api/delete-order/:id', (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM orders WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', err });
    }
    res.status(200).json({ message: 'cat deleted successfully' });
  });
});
// server.js or orderRoutes.js
// app.put('/api/update-order-status/:id', (req, res) => {
//     const { order_status } = req.body;
//     const orderId = req.params.id;
//     const sql = "UPDATE orders SET order_status = ? WHERE id = ?";

//     db.query(sql, [order_status, orderId], (err, result) => {
//         if (err) return res.status(500).json({ error: "Update failed" });
//         return res.json({ message: "Order status updated successfully" });
//     });
// });
//working..
app.put('/api/update-order-status/:id', (req, res) => {
  const { order_status } = req.body;
  const orderId = req.params.id;
  // console.log(orderId)
  const sql = "UPDATE orders SET order_status = ? WHERE id = ?";

  db.query(sql, [order_status, orderId], (err, result) => {
    console.log(orderId)
    if (err) return res.status(500).json({ error: "Update failed" });
    return res.json({ message: "Order status updated successfully" });
  });
});

// my-order(doubts see tom)

app.get('/api/my-orders', (req, res) => {
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  const orderQuery = `
    SELECT 
      o.id AS order_id,
      o.name,
      o.phone,
      o.address,
      o.city,
      o.state,
      o.pin,
      o.total_amount,
      o.payment_method,
      o.order_status,
      o.order_date AS created_at,  -- Changed to match your original table structure
      oi.id AS item_id,
      oi.pname,
      oi.product_id,
      oi.variant_id,
      oi.quantity,
      oi.price
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.phone = ?
    ORDER BY o.id DESC
  `;

  db.query(orderQuery, [phone], (err, results) => {
    if (err) {
      console.error('Order fetch error:', err);
      return res.status(500).json({ message: 'Failed to fetch orders' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'No orders found for this phone number' });
    }

    const ordersMap = new Map();

    results.forEach(row => {
      if (!ordersMap.has(row.order_id)) {
        ordersMap.set(row.order_id, {
          order_id: row.order_id,
          name: row.name,
          phone: row.phone,
          address: row.address,
          city: row.city,
          state: row.state,
          pin: row.pin,
          total_amount: row.total_amount,
          payment_method: row.payment_method,
          order_status: row.order_status,
          created_at: row.created_at,
          items: []
        });
      }

      if (row.item_id) {
        ordersMap.get(row.order_id).items.push({
          item_id: row.item_id,
          pname: row.pname,
          product_id: row.product_id,
          variant_id: row.variant_id,
          quantity: row.quantity,
          price: row.price
        });
      }
    });

    const orders = Array.from(ordersMap.values());

    res.json({ message: 'Orders fetched successfully', data: orders });
  });
});

// app.get('/api/user-orders', (req, res) => {
//   const userId = req.session.userId;

//   if (!userId) return res.status(401).json({ error: 'Unauthorized' });

//   const sql = `
//     SELECT o.id as order_id, o.order_date, o.total_amount, o.payment_method, o.payment_status,
//            oi.product_name, oi.variant_name, oi.quantity, oi.price
//     FROM orders o
//     JOIN order_items oi ON o.id = oi.order_id
//     WHERE o.phone = ?
//     ORDER BY o.order_date DESC
//   `;

//   db.query(sql, [userId], (err, results) => {
//     if (err) return res.status(500).json({ error: 'Database error' });

//     // Group order items by order_id
//     const grouped = {};
//     results.forEach(row => {
//       if (!grouped[row.order_id]) {
//         grouped[row.order_id] = {
//           order_id: row.order_id,
//           order_date: row.order_date,
//           payment_method: row.payment_method,
//           payment_status: row.payment_status,
//           total_amount: row.total_amount,
//           items: []
//         };
//       }

//       grouped[row.order_id].items.push({
//         product_name: row.product_name,
//         variant_name: row.variant_name,
//         quantity: row.quantity,
//         price: row.price
//       });
//     });

//     res.json(Object.values(grouped));
//   });
// });

// Api category wise get method

app.get("/api/categories-products", (req, res) => {
  const categoryQuery = "SELECT * FROM categories";

  db.query(categoryQuery, (err, categories) => {
    if (err) return res.status(500).json({ error: "Failed to fetch categories" });

    if (!categories.length) return res.json([]);

    let pending = categories.length;
    const result = [];

    categories.forEach((category) => {
      const productQuery = `
  SELECT 
    p.id AS product_id,
    p.pname AS product_name,
    pv.id AS variant_id,
    pv.price,
    pv.quantity,
    pv.old_price,
    pi.image
  FROM products p
  JOIN product_variants pv ON p.id = pv.product_id
  LEFT JOIN product_images pi ON p.id = pi.product_id
  WHERE p.category_id = ?
  ORDER BY p.created_at DESC
`;

      db.query(productQuery, [category.id], (err, rows) => {
        const productMap = {};

        if (!err) {
          rows.forEach(row => {
            if (!productMap[row.product_id]) {
              productMap[row.product_id] = {
                id: row.product_id,
                name: row.product_name,
                images: [],
                variants: []
              };
            }

            if (row.image && !productMap[row.product_id].images.includes(row.image)) {
              productMap[row.product_id].images.push(row.image);
            }

            productMap[row.product_id].variants.push({
              variant_id: row.variant_id,
              price: row.price,
              old_price: row.old_price,
              quantity: row.quantity
            });
          });
        }

        result.push({
          id: category.id,
          name: category.name,
          cat_img: category.cat_img,
          products: Object.values(productMap),
        });

        pending--;
        if (pending === 0) {
          res.json(result);
        }
      });
    });
  });
});
// Get products categories wise
// app.get("/api/category-products/:id", (req, res) => {
//   const categoryId = req.params.id;
//   const query = `
//     SELECT 
//       p.id AS product_id,
//       p.pname AS product_name,
//       pv.id AS variant_id,
//       pv.price,
//       pv.quantity,
//       pi.image
//     FROM products p
//     JOIN product_variants pv ON p.id = pv.product_id
//     LEFT JOIN product_images pi ON p.id = pi.product_id
//     WHERE p.category_id = ?
//   `;

//   db.query(query, [categoryId], (err, rows) => {
//     if (err) {
//       console.error("DB Error:", err);
//       return res.status(500).json({ error: "Failed to fetch products" });
//     }

//     console.log("Fetched rows for category:", categoryId, rows);

//     const productMap = {};
//     rows.forEach(row => {
//       if (!productMap[row.product_id]) {
//         productMap[row.product_id] = {
//           id: row.product_id,
//           pname: row.product_name,
//           images: [],
//           variants: []
//         };
//       }
//       if (row.image && !productMap[row.product_id].images.includes(row.image)) {
//         productMap[row.product_id].images.push(row.image);
//       }
//       productMap[row.product_id].variants.push({
//         variant_id: row.variant_id,
//         price: row.price,
//         quantity: row.quantity
//       });
//     });

//     res.json(Object.values(productMap));
//   });
// });
app.get("/api/category-products/:id", (req, res) => {
  const categoryId = req.params.id;
  const query = `
    SELECT 
      p.id AS product_id,
      p.pname AS product_name,
      pv.id AS variant_id,
      pv.price,
      pv.old_price,  -- Include old_price here
      pv.quantity,
      pi.image
    FROM products p
    JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN product_images pi ON p.id = pi.product_id
    WHERE p.category_id = ?
  `;

  db.query(query, [categoryId], (err, rows) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: "Failed to fetch products" });
    }

    console.log("Fetched rows for category:", categoryId, rows);

    const productMap = {};
    rows.forEach(row => {
      if (!productMap[row.product_id]) {
        productMap[row.product_id] = {
          id: row.product_id,
          pname: row.product_name,
          images: [],
          variants: []
        };
      }
      if (row.image && !productMap[row.product_id].images.includes(row.image)) {
        productMap[row.product_id].images.push(row.image);
      }
      productMap[row.product_id].variants.push({
        variant_id: row.variant_id,
        price: row.price,
        old_price: row.old_price,  // Add old_price to the variant object
        quantity: row.quantity
      });
    });

    res.json(Object.values(productMap));
  });
});


// Add to wishlist
app.post('/api/wishlist/add', (req, res) => {
  const { user_id, product_id } = req.body;

  if (!user_id || !product_id) {
    return res.status(400).json({ message: 'Missing user_id or product_id' });
  }

  const sql = 'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)';

  db.query(sql, [user_id, product_id], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Already in wishlist' });
      }
      return res.status(500).json({ message: 'DB Error', error: err });
    }
    res.status(200).json({ message: 'Added to wishlist' });
  });
});
// Get wishlist for user
app.get('/api/wishlist/:user_id', (req, res) => {
  const userId = req.params.user_id;

  const sql = `
    SELECT 
      wishlist.product_id AS id,
      products.pname,
      pv.price,
      image
    FROM wishlist
    JOIN products ON wishlist.product_id = products.id
    LEFT JOIN product_variants pv ON products.id = pv.product_id
    WHERE wishlist.user_id = ?
    GROUP BY products.id
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error("Error fetching wishlist:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(result);
  });
});

// Remove from wishlist
app.post('/api/wishlist/remove', (req, res) => {
  const { user_id, product_id } = req.body;

  const sql = 'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?';

  db.query(sql, [user_id, product_id], (err, result) => {
    if (err) {
      console.error('Error removing from wishlist:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
  });
});



// In server.js or your route file
app.post('/api/add-coupon', (req, res) => {
  
  const { code, discount_type, discount_value, min_order_amount, expiry_date, usage_limit } = req.body;
  const sql = `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, expiry_date, usage_limit)
               VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(sql, [code, discount_type, discount_value, min_order_amount, expiry_date, usage_limit], (err, result) => {
    if (err) {
      console.error("Error inserting coupon:", err);
      return res.status(500).json({ error: "Database insert error" });
    }
    res.json({ message: "Coupon added successfully!" });
  });
});


app.post('/api/apply-coupon', (req, res) => {
  const { code, total } = req.body;

  if (!code || !total) {
    return res.status(400).json({ error: 'Coupon code and total amount are required' });
  }

  const sql = `
    SELECT * FROM coupons
    WHERE code = ? AND is_active = 1 AND expiry_date >= CURDATE()
    LIMIT 1
  `;

  db.query(sql, [code], (err, result) => {
    if (err) {
      console.error("Error checking coupon:", err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired coupon code' });
    }

    const coupon = result[0];

    if (total < coupon.min_purchase) {
      return res.status(400).json({ error: `Minimum purchase should be ₹${coupon.min_purchase}` });
    }

    let discount = 0;

    if (coupon.discount_type === 'percentage') {
      discount = (total * coupon.discount_value) / 100;
    } else if (coupon.discount_type === 'fixed') {
      discount = coupon.discount_value;
    }

    // Cap discount at max_discount (if applicable)
    if (coupon.max_discount && discount > coupon.max_discount) {
      discount = coupon.max_discount;
    }

    const finalAmount = total - discount;

    res.json({
      success: true,
      message: 'Coupon applied successfully',
      couponCode: coupon.code,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      discountAmount: Math.round(discount),
      finalAmount: Math.round(finalAmount)
    });
  });
});

// app.post('/api/validate-coupon', (req, res) => {
//   const { code, totalAmount } = req.body;

//   const sql = `
//     SELECT * FROM coupons 
//     WHERE code = ? 
//       AND expiry_date >= CURDATE() 
//       AND usage_limit > 0
//   `;

//   db.query(sql, [code], (err, results) => {
//     if (err) return res.status(500).json({ error: 'DB error' });

//     if (results.length === 0) {
//       return res.status(400).json({ error: 'Invalid or expired coupon' });
//     }

//     const coupon = results[0];

//     if (totalAmount < coupon.min_order_amount) {
//       return res.status(400).json({ error: `Minimum order amount must be ₹${coupon.min_order_amount}` });
//     }

//     let discount = 0;
//     if (coupon.discount_type === 'flat') {
//       discount = coupon.discount_value;
//     } else if (coupon.discount_type === 'percentage') {
//       discount = (totalAmount * coupon.discount_value) / 100;
//     }

//     const newTotal = totalAmount - discount;

//     return res.json({
//       success: true,
//       discount: discount.toFixed(2),
//       newTotal: newTotal.toFixed(2),
//       message: `Coupon applied! You saved ₹${discount.toFixed(2)}`
//     });
//   });
// });
app.post('/api/validate-coupon', (req, res) => {
  const { code, totalAmount } = req.body;

  const sql = `
    SELECT * FROM coupons 
    WHERE code = ? 
      AND expiry_date >= CURDATE() 
      AND usage_limit > 0
  `;

  db.query(sql, [code], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });

    if (results.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired coupon' });
    }

    const coupon = results[0];

    // Ensure totalAmount is a number
    if (typeof totalAmount !== 'number' || totalAmount < 0) {
      return res.status(400).json({ error: 'Invalid total amount' });
    }

    // Check minimum order amount
    if (totalAmount < coupon.min_order_amount) {
      return res.status(400).json({ error: `Minimum order amount must be ₹${coupon.min_order_amount}` });
    }

    let discount = 0;
    if (coupon.discount_type === 'flat') {
      discount = parseFloat(coupon.discount_value) || 0; // Ensure it's a number
    } else if (coupon.discount_type === 'percentage') {
      discount = (totalAmount * (parseFloat(coupon.discount_value) || 0)) / 100; // Ensure it's a number
    }

    // Ensure discount is not negative
    discount = Math.max(discount, 0);

    const newTotal = totalAmount - discount;

    return res.json({
      success: true,
      discount: discount.toFixed(2), // Return as string for display
      newTotal: newTotal.toFixed(2), // Return as string for display
      message: `Coupon applied! You saved ₹${discount.toFixed(2)}`
    });
  });
});



// Feedback route Post method
app.post('/api/feedback', (req, res) => {
  const { fname, email, message } = req.body;
  console.log(req.body)

  if (!fname || !email || !message) {
    return res.status(400).json({ err: 'All fields are required' });
  }

  const sql = "INSERT INTO feedback(fname, email, message) VALUES (?, ?, ?)";
  db.query(sql, [fname, email, message], (err, data) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ err: "Database error" });
    }
    res.status(201).json({ message: "Data added", id: data.insertId });
  });
});

// Get all feedbacks Get Method
app.get('/api/feedback', (req, res) => {
  const sql = "SELECT * FROM feedback ORDER BY id DESC";
  db.query(sql, (err, data) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ err: "Database error" });
    }
    res.json(data);
  });
});
// payment gateway api

// app.post('/api/initiate-payment', async (req, res) => {
//   const { txnid, amount, productinfo, firstname, email, phone } = req.body;

//   const key = 'Y6JBRL0TP';
//   const salt = '272FQZL6N';
//   const surl = 'http://localhost:3000/success';
//   const furl = 'http://localhost:3000/failure';

//   const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
//   const hash = crypto.createHash('sha512').update(hashString).digest('hex');

//   try {
//     const response = await axios.post('https://pay.easebuzz.in/payment/initiateLink', {
//       key,
//       txnid,
//       amount,
//       productinfo,
//       firstname,
//       email,
//       phone,
//       hash,
//       udf1: '',
//       udf2: '',
//       udf3: '',
//       udf4: '',
//       udf5: '',
//       surl,
//       furl,
//     });

//     res.json({ success: true, payment_link: response.data.data.payment_link });
//   } catch (error) {
//     console.error('Easebuzz API Error:', error.response ? error.response.data : error.message);
//     res.status(500).json({ success: false, error: 'Failed to initiate payment' });
//   }
// });
// Easebuzz Test Credentials
const key = "DkMtzm";
const salt = "ZzRfZ4Fbq3";

app.post('/easebuzz/initiate-payment', (req, res) => {
  const {
    txnid,
    amount,
    firstname,
    email,
    phone,
    productinfo,
    surl,
    furl
  } = req.body;

  if (!txnid || !amount || !firstname || !email || !phone || !productinfo || !surl || !furl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
  const hash = crypto.createHash('sha512').update(hashString).digest('hex');

  const paymentData = {
    action: "https://testpay.easebuzz.in/pay/secure",
    params: {
      key,
      txnid,
      amount,
      firstname,
      email,
      phone,
      productinfo,
      surl,
      furl,
      hash
    }
  };

  res.json(paymentData);
});



app.listen(PORT, () => {
  console.log(`server  started on ${PORT}`)
})