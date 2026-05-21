const { CognitoIdentityProviderClient, InitiateAuthCommand } = require("@aws-sdk/client-cognito-identity-provider");
const crypto = require("crypto"); // <-- Tambahkan library crypto bawaan Node.js

// 初始化 Cognito 客戶端
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || "us-east-1" });

// 補助函式：計算 Cognito 所需的 SECRET_HASH
function calculateSecretHash(clientId, clientSecret, username) {
    return crypto
        .createHmac("sha256", clientSecret)
        .update(username + clientId)
        .digest("base64");
}

exports.handler = async (event) => {
    // 1. 解析前端傳入的資料（支援 username 或 email）
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event;
    
    // 同時檢查前端傳入的是 username 還是 email
    const accountId = body.username || body.email; 
    const { password } = body;

    if (!accountId || !password) {
        return {
            statusCode: 400,
            headers: { 
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ error: "請填寫帳號（用戶名/電子郵件）與密碼。" })
        };
    }

    const clientId = process.env.COGNITO_CLIENT_ID;
    const clientSecret = process.env.COGNITO_CLIENT_SECRET; // <-- 讀取 Client Secret 環境變數

    if (!clientId) {
        console.error("Missing COGNITO_CLIENT_ID environment variable");
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "伺服器內部設定錯誤 (缺少 Client ID)" })
        };
    }

    // 2. 設定 Cognito 驗證參數
    const authParameters = {
        USERNAME: accountId,
        PASSWORD: password
    };

    // 如果環境變數中有設定 Client Secret，則自動計算並加上 SECRET_HASH
    if (clientSecret) {
        try {
            authParameters.SECRET_HASH = calculateSecretHash(clientId, clientSecret, accountId);
        } catch (hashError) {
            console.error("Calculate Secret Hash Error:", hashError);
            return {
                statusCode: 500,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ error: "加密金鑰計算失敗" })
            };
        }
    }

    const params = {
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: clientId,
        AuthParameters: authParameters
    };

    try {
        // 3. 發送請求至 Cognito 進行驗證
        const command = new InitiateAuthCommand(params);
        const authResult = await cognitoClient.send(command);

        // 4. 登入成功，回傳 JWT Token 組合
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "登入成功",
                token: {
                    idToken: authResult.AuthenticationResult.IdToken,
                    accessToken: authResult.AuthenticationResult.AccessToken,
                    refreshToken: authResult.AuthenticationResult.RefreshToken,
                    expiresIn: authResult.AuthenticationResult.ExpiresIn
                }
            })
        };

    } catch (error) {
        console.error("Cognito Auth Error:", error);

        // 處理 Cognito 常見的錯誤類型
        let statusCode = 400;
        let errorMessage = "登入失敗，請稍後再試。";

        if (error.name === "UserNotConfirmedException") {
            errorMessage = "該帳號尚未完成驗證。";
        } else if (error.name === "NotAuthorizedException") {
            errorMessage = "帳號或密碼錯誤。"; 
        } else if (error.name === "UserNotFoundException") {
            errorMessage = "找不到該使用者帳號。";
        }

        return {
            statusCode: statusCode,
            headers: { 
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error: error.name,
                message: errorMessage
            })
        };
    }
};
