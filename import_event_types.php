<?php
require_once __DIR__ . '/core/bootstrap.php';

// setup db connection
$pdo_conn = require_once 'db_connect.php';
/* @var $pdo_conn PDO */

$sql = <<<SQL
INSERT INTO
    clocktowercon.event_types
    (id, name, relationships)
VALUES
    (?, ?, ?);
SQL;
$spaceInsertStmt = $pdo_conn->prepare($sql);

// get initial data
$data = json_decode(file_get_contents('.\static\2025\eventtypes.json'), true);

foreach ($data['result']['items'] as $row) {
    $spaceInsertStmt->execute([
        $row['id'],
        $row['name'],
        json_encode($row['_relationships'] ?? [])
    ]);
}

echo "Done!";
