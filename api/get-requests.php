<?php
header('Content-Type: application/json; charset=utf-8');

$logFile = __DIR__ . '/requests.log';

if (!file_exists($logFile)) {
    echo json_encode([]);
    exit;
}

$lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$result = [];

foreach ($lines as $line) {
    // формат: дата | имя | телефон | адрес | комментарий
    $parts = explode('|', $line);
    if (count($parts) < 5) continue;

    $result[] = [
        'created_at' => trim($parts[0]),
        'name'       => trim($parts[1]),
        'phone      '=> trim($parts[2]),
        'address'    => trim($parts[3]),
        'comment'    => trim($parts[4]),
    ];
}

echo json_encode($result);
