import { MongoClient } from "mongodb";

if (process.env.MONGODB_URI === undefined) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = { appName: "lll-app" };

let client: MongoClient;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // Is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClient?: MongoClient;
  };

  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(uri, options);
  }
  client = globalWithMongo._mongoClient;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
}

// Export a module-scoped MongoClient. By doing this in a
// Separate module, the client can be shared across functions.

export default client;
