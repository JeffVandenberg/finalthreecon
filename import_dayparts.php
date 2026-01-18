<?php
require_once __DIR__ . '/core/bootstrap.php';

// get initial data
$data = json_decode(file_get_contents('./static/2026/dayparts_1.json'), true);

// setup db connection
$pdo_conn = require_once 'db_connect.php';
/* @var $pdo_conn PDO */

$sql = <<<SQL
TRUNCATE 
    dayparts;
SQL;
$daypartsTruncate = $pdo_conn->exec($sql);

$sql = <<<SQL
INSERT INTO
    dayparts
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

echo "Imported Day Parts!";
