<?php
require_once __DIR__ . '/core/bootstrap.php';

// setup db connection
$pdo_conn = require_once 'db_connect.php';
/* @var $pdo_conn PDO */

$sql = <<<SQL
INSERT INTO
    badge_types
    (id, badge_type_name)
VALUES
    (?, ?);
SQL;
$spaceInsertStmt = $pdo_conn->prepare($sql);

// get initial data
$data = json_decode(file_get_contents('./static/2026/badge_types.json'), true);
foreach ($data['result']['items'] as $row) {
    $spaceInsertStmt->execute([
        $row['id'],
        $row['name']
    ]);
}

echo "Done!";
