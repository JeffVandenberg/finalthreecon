<?php
require_once __DIR__ . '/core/bootstrap.php';

// get initial data
$data = json_decode(file_get_contents('.\static\2025\spaces.json'), true);

// setup db connection
$pdo_conn = require_once 'db_connect.php';
/* @var $pdo_conn PDO */

$sql = <<<SQL
INSERT INTO
    clocktowercon.spaces
    (id, name, room_id, relationships, date_created, date_updated)
VALUES
    (?, ?, ?, ?, ?, ?);
SQL;
$spaceInsertStmt = $pdo_conn->prepare($sql);


foreach($data['result']['items'] as $row) {
    $spaceInsertStmt->execute([
        $row['id'],
        $row['name'],
        $row['room_id'],
        json_encode($row['_relationships'] ?? []),
        $row['date_created'],
        $row['date_updated']
    ]);
}

echo "Done!";
