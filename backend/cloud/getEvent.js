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

    // 3. Petakan data untuk memastikan properti 'humidity' dan 'rainStatus' seragam
    const HUMIDITY_THRESHOLD = 85; // Samakan threshold-nya dengan Lambda IoT Anda
    
    const formattedItems = (data.Items || []).map(item => {
      // Tentukan status hujan berdasarkan nilai kelembaban saat ini
      const isRaining = item.humidity && item.humidity >= HUMIDITY_THRESHOLD;
      
      return {
        ...item,
        humidity: item.humidity !== undefined ? item.humidity : 0, // Beri default 0 jika data lama kosong
        rainStatus: isRaining ? "RAIN" : "DRY" // Status tambahan sesuai permintaan Anda
      };
    });

    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      // 4. Kembalikan array Items yang sudah diperbarui formatting-nya
      body: JSON.stringify(formattedItems)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        error: "Debugging Error", 
        message: error.message, 
        name: error.name,       
        region: process.env.AWS_REGION 
      })
    };
  }
};
