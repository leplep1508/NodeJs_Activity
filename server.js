const express = require('express');
const mustacheExpress = require('mustache-express');
const bodyParser = require('body-parser')
const http              = require('http').Server(express);
const MongoClient       = require('mongodb').MongoClient;
const ObjectID          = require('mongodb').ObjectID;
const socketio          = require('socket.io')(http);


// db name
const db_name           = "ecommerce" 
// global variable for accessing the DB later
var mongoDb;
// global variable for socket
var socketObject;

// Connecting to the MongoDB server
MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    if (err) {
        console.log("Could not connect to the DB");
    } else {
        // We got the client
        // now, lets use the database
        mongoDb = client.db(db_name);
        console.log("Connected to DB")
    }
});

const app = express();

app.use(express.static(__dirname + "/public"));
// Using the bodyparser middleware for parsing the form submissions
app.use(bodyParser.urlencoded({extended: true}));
// Using mustache for handling .html files
app.engine('html', mustacheExpress());
// Setting the view engine to be Mustache(html)
app.set('view engine', 'html');
// Setting the views directory so .html files can be found by express/mustache
app.set('views', __dirname + '/views');
// Setting the layout directory
app.set("layout", "layouts/mainLayout");


app.get ('/admin', (req, res) => {
    const loginPage = require('./authentications/auth')
    res.send (loginPage.html)
})

app.post ('/admin', (req, res) => {
    const username = req.body.u 
    const password = req.body.p 
    
    if (username === "admin" && password === "admin") {
            res.redirect ('/')
    }else {
             res.redirect('/admin')
    }
})

app.get("/", (req, res) => {
    // Selecting ALL the products from the "product" collection
    // and then converting that into an Array
    mongoDb.collection('products').find().toArray(function(err, results) {
        // Here we have the results containing an array of products
        // we pass that to the home.html template for rendering
        res.render('home.html', { products: results });
    });    
});

// this is for showting the "Create New Product" form
app.get("/form", (req, res) => {
    res.render('form.html');
})

// add to cart
app.get ("/product/:id/addtocart", (req,res) => {
    const id = req.params.id 

    mongoDb.collection('products').findOne({ _id: new ObjectID(id)}, (err, data) => {
        res.render("productDetails.html", { 
            product: data
        })
    }); 
})

// this gets called when the form is submitted via POST
app.post("/product/create", (req, res) => {
    // We're calling the collection and saving our form data we got from the request.body
    mongoDb.collection("products").save(req.body, (err, result) => {
        if (err) return console.log(err);

        io.sockets.emit("product_added");

        // After saving, we redirect to the home page
        res.redirect('/');
      })
});

// This is for viewing individual product
app.get("/product/:id", (req, res) => {
    // we get the id from the URL
    const id = req.params.id;

    // Now we query the products collection
    // and search for the product by ID
    mongoDb.collection('products').findOne({ _id: new ObjectID(id)}, (err, data) => {
        // when we get the product
        // we pass it to the proudct.html template
        res.render("product.html", { product: data });  
    });
});

// This is for editing a product
app.get("/product/:id/edit", (req, res) => {
    const id = req.params.id;

    mongoDb.collection('products').findOne({ _id: new ObjectID(id)}, (err, data) => {
        res.render("edit.html", { product: data })
    });

    
});

//Product details
app.get ("/product/:id/details", (req,res) =>{
    const id = req.params.id;

    mongoDb.collection('products').findOne({ _id: new ObjectID(id)}, (err, data) => {
        res.render("productDetails.html", { product: data })
    });    
})

// this gets called when we submit the form from the edit page
app.post("/product/:id/update", (req, res) => {
    const id = req.params.id;

    //now, instead of saving, we're calling 
    // the update method for updating the product
    mongoDb.collection("products").update(
        { 
            _id: new ObjectID(id)
        },
        req.body, (err, result) => {
        if (err) return console.log(err)
    
        // After saving, redirect back to the homepage
        res.redirect('/')
      })
});

//This is when you want to delete an object
app.post("/product/:id/delete", (req, res) => {
    const id = req.params.id;

    //now, instead of saving, we're calling 
    // the remove method for deleting the product
    mongoDb.collection("products").removeOne(
        { _id: new ObjectID(id)}, (err, result) => {
        if (err) return console.log(err) 
    
        io.sockets.emit("product_added");

        // After removing, redirect back to the homepage
        res.redirect('/')
      })
});

// Just a static about page
app.get("/about", (req, res) => {
    io.sockets.emit("product_added");
    
    res.render('about.html');
});

var io = require('socket.io').listen(app.listen(3000));//Telling Express+Socket.io App To Listen To Port

io.sockets.on("connection",function(socket) {
    socketObject = socket;
    console.log('a user connected');
})

// app.listen(3000, () => {
//     console.log('server started');
// })