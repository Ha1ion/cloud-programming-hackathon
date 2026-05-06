// 1. Gunakan library modular (v3)
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(client);

exports.handler = async () => {
  try {
    // 2. Ambil data dengan ScanCommand
    const data = await db.send(new ScanCommand({ 
      TableName: "events" 
    }));

    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      // 3. Kembalikan array Items
      body: JSON.stringify(data.Items || [])
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Debugging Error", 
        message: error.message, // Pesan error asli dari AWS
        name: error.name,       // Nama error (misal: ResourceNotFoundException)
        region: process.env.AWS_REGION // Mengetahui Lambda jalan di region mana
      })
    };
  }
};
