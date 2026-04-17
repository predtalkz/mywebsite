<?php
/**
 * HTTPS-safe proxy for Admin KYC portal.
 * Browser talks to this same-origin PHP endpoint over HTTPS.
 * Server-side PHP calls the existing HTTP backend.
 */

$backendBase = 'http://api.dtalkz.com:8082';

function sendJson($code, $payload) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($payload);
    exit;
}

function relayRequest($url, $method, $headers = [], $body = null) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HEADER, true);
    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    $response = curl_exec($ch);
    if ($response === false) {
        $err = curl_error($ch);
        curl_close($ch);
        sendJson(502, ['statusCode' => 502, 'data' => 'Proxy upstream error: ' . $err]);
    }

    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $respHeadersRaw = substr($response, 0, $headerSize);
    $respBody = substr($response, $headerSize);
    curl_close($ch);

    return [$status, $respHeadersRaw, $respBody];
}

$assetPath = isset($_GET['asset']) ? trim($_GET['asset']) : '';
if ($assetPath !== '') {
    if (strpos($assetPath, '/images/kyc/') !== 0) {
        sendJson(400, ['statusCode' => 400, 'data' => 'Invalid asset path']);
    }
    $url = $backendBase . $assetPath;
    list($status, $respHeadersRaw, $respBody) = relayRequest($url, 'GET');
    http_response_code($status);

    $contentType = 'application/octet-stream';
    foreach (explode("\r\n", $respHeadersRaw) as $line) {
        $parts = explode(':', $line, 2);
        if (count($parts) === 2 && strtolower(trim($parts[0])) === 'content-type') {
            $contentType = trim($parts[1]);
            break;
        }
    }
    header('Content-Type: ' . $contentType);
    header('Cache-Control: no-store');
    echo $respBody;
    exit;
}

$endpoint = isset($_GET['endpoint']) ? trim($_GET['endpoint']) : '';
if ($endpoint === '' || strpos($endpoint, '/v1/admin/') !== 0) {
    sendJson(400, ['statusCode' => 400, 'data' => 'Valid admin endpoint is required']);
}

$query = isset($_GET['query']) ? trim($_GET['query']) : '';
$url = $backendBase . $endpoint . ($query !== '' ? ('?' . $query) : '');
$method = isset($_GET['method']) ? strtoupper(trim($_GET['method'])) : $_SERVER['REQUEST_METHOD'];
$allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
if (!in_array($method, $allowedMethods, true)) {
    sendJson(400, ['statusCode' => 400, 'data' => 'Invalid method']);
}
$headers = [];
$body = null;

if (isset($_GET['payload'])) {
    $decodedPayload = base64_decode($_GET['payload'], true);
    if ($decodedPayload === false) {
        sendJson(400, ['statusCode' => 400, 'data' => 'Invalid payload']);
    }
    $body = $decodedPayload;
} else {
    $body = file_get_contents('php://input');
}

if (isset($_SERVER['HTTP_AUTHORIZATION']) && $_SERVER['HTTP_AUTHORIZATION'] !== '') {
    $headers[] = 'Authorization: ' . $_SERVER['HTTP_AUTHORIZATION'];
}
if (isset($_SERVER['CONTENT_TYPE']) && $_SERVER['CONTENT_TYPE'] !== '') {
    $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
}

if ($body !== null && $body !== '') {
    $decodedJson = json_decode($body, true);
    if (is_array($decodedJson) && isset($decodedJson['authorization'])) {
        $headers[] = 'Authorization: ' . $decodedJson['authorization'];
        unset($decodedJson['authorization']);
        $body = json_encode($decodedJson);
    }
}

if (!empty($body) && strpos(implode('|', $headers), 'Content-Type:') === false) {
    $headers[] = 'Content-Type: application/json';
}

if ($method === 'GET') {
    $body = null;
}

list($status, $_respHeadersRaw, $respBody) = relayRequest($url, $method, $headers, $body);
http_response_code($status);
header('Content-Type: application/json');
header('Cache-Control: no-store');
echo $respBody;
