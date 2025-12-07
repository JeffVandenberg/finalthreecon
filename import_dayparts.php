<?php
require_once __DIR__ . '/core/bootstrap.php';

// get initial data
$data = json_decode(file_get_contents('.\static\2025\dayparts_2.json'), true);

// setup db connection
$pdo_conn = require_once 'db_connect.php';
/* @var $pdo_conn PDO */

$sql = <<<SQL
INSERT INTO
    clocktowercon.dayparts
    (id, name, start_date, dayname)
VALUES
    (?, ?, ?, ?);
SQL;
$spaceInsertStmt = $pdo_conn->prepare($sql);


foreach($data['result']['items'] as $row) {
    $spaceInsertStmt->execute([
        $row['id'],
        $row['name'],
        $row['start_date'],
        substr($row['name'], 0, strpos($row['name'], ' '))
    ]);
}

echo "Done!";
