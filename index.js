const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require('dotenv').config();
const port = process.env.PORT || 5000
const app = express();

// middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'https://food-villa-5b01d.web.app', 'https://food-villa-5b01d.firebaseapp.com'],
    credentials: true,
    optionsSuccessStatus: 200
}))
app.use(express.json())
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xrf0qev.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


// middleware jwt verify

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;
    console.log(token)
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    if (token) {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                console.log(err)
                return res.status(401).send({ message: 'unauthorized access' });
            }
            console.log(decoded)
            req.user = decoded
            next()
        })
    }
}

async function run() {
    try {
        // collections
        const foodCollection = client.db('foodVillaDb').collection('Foods');
        const purchaseCollection = client.db('foodVillaDb').collection('purchases');
        const feedbackCollection = client.db('foodVillaDb').collection('feedbacks');

        // auth related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
            }).send({ success: true })
        })

        app.get('/logOut', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                maxAge: 0
            }).send({ success: true })
        })

        // service related api
        // get all food from db
        app.get('/foods', async (req, res) => {
            const search = req.query.search;
            const foodQuery = { name: { $regex: search, $options: 'i' } }
            const result = await foodCollection.find(foodQuery).toArray();
            res.send(result)
        })


        // get top foods item by sorting based on purchase count
        app.get('/top-foods', async (req, res) => {
            const options = {
                sort: { purchase_count: -1 }
            }
            const result = await foodCollection.find({}, options).toArray();
            res.send(result)
        })

        // get food item based on user email
        app.get('/myFood', verifyToken, async (req, res) => {
            const tokenEmail = req.user.email;
            const userEmail = req.query?.email
            if (tokenEmail !== userEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            let query = {}
            if (req.query?.email) { query = { adder_email: req.query.email } }
            const result = await foodCollection.find(query).toArray()
            res.send(result)
        })

        // get purchased food item based on user email
        app.get('/myPurchasedFood', verifyToken, async (req, res) => {
            const tokenEmail = req.user.email;
            const userEmail = req.query?.email
            if (tokenEmail !== userEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            let query = {}
            if (req.query?.email) { query = { Buyer_email: req.query.email } }
            const result = await purchaseCollection.find(query).toArray()
            res.send(result)
        })

        // get food item based on id
        app.get('/single-food/:id', async (req, res) => {
            const query = { _id: new ObjectId(req.params.id) }
            const result = await foodCollection.findOne(query);
            res.send(result)
        })
        // get food item based on id
        app.get('/feedbacks', async (req, res) => {
            const result = await feedbackCollection.find().toArray();
            res.send(result)
        })

        // post purchase food item
        app.post('/purchase', async (req, res) => {
            const newPurchase = req.body;
            const id = newPurchase.foodId;
            const purchaseQuantity = newPurchase.quantity;
            const result = await purchaseCollection.insertOne(newPurchase);
            // update purchase count in foodcollection

            const foodQuery = { _id: new ObjectId(id) };

            const updateDoc = {

                $inc: {
                    purchase_count: purchaseQuantity,
                    quantity: -purchaseQuantity
                }

            }
            const updatePurchaseCount = await foodCollection.updateOne(foodQuery, updateDoc)
            res.send(result)
        })

        // post added food item
        app.post('/added', async (req, res) => {
            const newAdded = req.body;
            const result = await foodCollection.insertOne(newAdded);
            res.send(result)
        })

        // post customer feedback
        app.post('/feedback', async (req, res) => {
            const newFeedback = req.body;
            const result = await feedbackCollection.insertOne(newFeedback);
            res.send(result)
        })

        // update food based on id
        app.put('/update/:id', async (req, res) => {
            const query = { _id: new ObjectId(req.params.id) }
            const updatedFood = req.body
            const food = {
                $set: {
                    name: updatedFood.name,
                    image: updatedFood.image,
                    category: updatedFood.category,
                    origin: updatedFood.origin,
                    price: updatedFood.price,
                    made_by: updatedFood.made_by,
                    quantity: updatedFood.quantity,
                    details: updatedFood.details,
                }
            }
            const result = await foodCollection.updateOne(query, food);
            res.send(result)
        })
        // delete item based on id
        app.delete('/delete/:id', async (req, res) => {
            console.log(req.params.id)
            const query = { _id: new ObjectId(req.params.id) }
            const result = await purchaseCollection.deleteOne(query);
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('hello from food villa server')
})

app.listen(port, () => console.log(`server running on port ${port}`))