<?php
/**
 * Delete Account Request Handler
 * This file handles the account deletion request by making a secure API call server-side
 */

// Set headers for JSON response
header('Content-Type: application/json');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Get and validate input data
$userName = isset($_POST['userName']) ? trim($_POST['userName']) : '';
$phoneNumber = isset($_POST['phoneNumber']) ? trim($_POST['phoneNumber']) : '';

// Validate required fields
if (empty($userName) || empty($phoneNumber)) {
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

// Handle cURL errors
if ($curlError) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to connect to the server. Please try again later.'
    ]);
    exit;
}

// Handle API response
if ($httpCode >= 200 && $httpCode < 300) {
    // Success response
    $responseData = json_decode($response, true);
    echo json_encode([
        'success' => true,
        'message' => 'Account deletion request submitted successfully',
        'data' => $responseData
    ]);
} else {
    // Error response
    $errorData = json_decode($response, true);
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'message' => isset($errorData['message']) ? $errorData['message'] : 'An error occurred while processing your request',
        'error' => $errorData
    ]);
}
?>

