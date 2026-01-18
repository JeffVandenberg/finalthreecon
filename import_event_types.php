<?php
require_once __DIR__ . '/core/bootstrap.php';

// setup db connection
$pdo_conn = require_once 'db_connect.php';
/* @var $pdo_conn PDO */

$sql = <<<SQL
TRUNCATE TABLE event_types;
SQL;
$pdo_conn->exec($sql);

$sql = <<<SQL
INSERT INTO
    event_types
    (id, name, relationships)
VALUES
    (?, ?, ?);
SQL;
$spaceInsertStmt = $pdo_conn->prepare($sql);

// get initial data
$data = json_decode(file_get_contents('./static/2026/eventtypes.json'), true);

foreach ($data['result']['items'] as $row) {
    $spaceInsertStmt->execute([
        $row['id'],
        $row['name'],
        json_encode($row['_relationships'] ?? [])
    ]);
}

echo "Imported Event Types!\n";
