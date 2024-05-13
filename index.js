const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000
const app = express();

// middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    optionsSuccessStatus: 200
}))
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xrf0qev.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // collections
        const foodCollection = client.db('foodVillaDb').collection('Foods');
        const purchaseCollection = client.db('foodVillaDb').collection('purchases');


        // get all food from db
        app.get('/foods', async (req, res) => {
            const result = await foodCollection.find().toArray();
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
        app.get('/myFood/:email', async (req, res) => {
            const query = { adder_email: req.params.email }
            const result = await foodCollection.find(query).toArray()
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
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