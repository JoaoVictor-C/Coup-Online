﻿using MongoDB.Driver;
using MongoDB.Bson;

const string connectionUri = "mongodb+srv://Joao:yOlU0SaPFOK9rluZ@couponline.l1sog.mongodb.net/CoupOnline?retryWrites=true&w=majority&appName=CoupOnline";

var settings = MongoClientSettings.FromConnectionString(connectionUri);

// Set the ServerApi field of the settings object to set the version of the Stable API on the client
settings.ServerApi = new ServerApi(ServerApiVersion.V1);

// Create a new client and connect to the server
var client = new MongoClient(settings);

// Send a ping to confirm a successful connection
try {
  var result = client.GetDatabase("admin").RunCommand<BsonDocument>(new BsonDocument("ping", 1));
  Console.WriteLine("Pinged your deployment. You successfully connected to MongoDB!");
} catch (Exception ex) {
  Console.WriteLine(ex);
}
