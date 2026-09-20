<?php
header('Content-Type: application/json; charset=utf-8');

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['phone'])) {
    http_response_code(400);
    echo json_encode(['error' => 'bad request']);
    exit;
}

$name = $data['name'] ?? '';
$phone = $data['phone'] ?? '';
$address = $data['address'] ?? '';
$comment = $data['comment'] ?? '';

$line = date('Y-m-d H:i:s') . " | $name | $phone | $address | $comment" . PHP_EOL;
file_put_contents(__DIR__ . '/requests.log', $line, FILE_APPEND);

echo json_encode(['status' => 'ok']);
