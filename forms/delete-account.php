<?php
/**
 * Delete Account Request Handler
 * This file handles the account deletion request by making a secure API call server-side
 */

// Disable error display and ensure clean output
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Set headers for JSON response (must be first output)
header('Content-Type: application/json; charset=utf-8');

// Prevent any output before JSON
ob_start();

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_end_clean();
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Get and validate input data
$userName = isset($_POST['userName']) ? trim($_POST['userName']) : '';
$phoneNumber = isset($_POST['phoneNumber']) ? trim($_POST['phoneNumber']) : '';

// Validate required fields
if (empty($userName) || empty($phoneNumber)) {
    ob_end_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'User name and phone number are required']);
    exit;
}

// Get user's IP address server-side
function getUserIP() {
    $ipKeys = ['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 'HTTP_X_CLUSTER_CLIENT_IP', 'HTTP_FORWARDED_FOR', 'HTTP_FORWARDED', 'REMOTE_ADDR'];
    
    foreach ($ipKeys as $key) {
        if (array_key_exists($key, $_SERVER) === true) {
            foreach (explode(',', $_SERVER[$key]) as $ip) {
                $ip = trim($ip);
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                    return $ip;
                }
            }
        }
    }
    
    // Fallback to REMOTE_ADDR
    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
}

$userIP = getUserIP();

// Prepare API request data
$apiData = [
    'userName' => $userName,
    'phoneNumber' => $phoneNumber,
    'ipAddress' => $userIP
];

// API endpoint
$apiUrl = 'http://api.dtalkz.com:8082/account/delete';

// Initialize cURL
$ch = curl_init($apiUrl);

// Set cURL options
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($apiData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen(json_encode($apiData))
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);

// Execute the request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);

curl_close($ch);

// Log the API response for debugging (remove in production)
// error_log("API Response Code: " . $httpCode);
// error_log("API Response: " . $response);

// Handle cURL errors
if ($curlError) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to connect to the server. Please try again later.',
        'error' => $curlError
    ]);
    exit;
}

// Clean any output buffer before sending JSON
ob_end_clean();

// Handle API response
try {
    // Check if we got a valid HTTP code
    if ($httpCode === 0 || $httpCode === false) {
        // No HTTP code means connection failed
        ob_end_clean();
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to connect to the API server',
            'error' => 'Connection failed or timeout'
        ]);
        exit;
    }
    
    if ($httpCode >= 200 && $httpCode < 300) {
        // Success response from API
        $responseData = json_decode($response, true);
        
        // If response is not valid JSON, wrap it
        if (json_last_error() !== JSON_ERROR_NONE) {
            // API returned non-JSON response, wrap it
            $responseData = [
                'raw_response' => $response,
                'httpCode' => $httpCode
            ];
        }
        
        // Return success response to frontend
        ob_end_clean();
        echo json_encode([
            'success' => true,
            'message' => 'Account deletion request submitted successfully',
            'data' => $responseData,
            'apiResponse' => $response, // Include raw API response for debugging
            'httpCode' => $httpCode
        ]);
    } else {
        // Error response from API
        $errorData = json_decode($response, true);
        
        // If response is not valid JSON, use the raw response
        if (json_last_error() !== JSON_ERROR_NONE) {
            $errorData = [
                'raw_response' => $response,
                'httpCode' => $httpCode
            ];
        }
        
        ob_end_clean();
        http_response_code($httpCode);
        echo json_encode([
            'success' => false,
            'message' => isset($errorData['message']) ? $errorData['message'] : 'An error occurred while processing your request',
            'error' => $errorData,
            'apiResponse' => $response, // Include raw API response for debugging
            'httpCode' => $httpCode
        ]);
    }
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An unexpected error occurred',
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>

