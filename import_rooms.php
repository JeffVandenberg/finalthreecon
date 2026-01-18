<?php
require_once __DIR__ . '/core/bootstrap.php';

// get initial data
$data = json_decode(file_get_contents('./static/2026/rooms.json'), true);

// setup db connection
$pdo_conn = require_once 'db_connect.php';
/* @var $pdo_conn PDO */

$sql = <<<SQL
TRUNCATE 
    rooms
SQL;
$roomTruncate = $pdo_conn->exec($sql);

$sql = <<<SQL
TRUNCATE
    room_dayparts
SQL;
$roomDayPartTruncate = $pdo_conn->exec($sql);

$sql = <<<SQL
INSERT INTO
    rooms
    (id, name, description, relationships, date_created, date_updated)
VALUES
    (?, ?, ?, ?, ?, ?);
SQL;
$roomInsertStmt = $pdo_conn->prepare($sql);

$sql = <<<SQL
INSERT INTO
    room_dayparts
    (daypart_id, room_id, name, start_date)
VALUES
    (?, ?, ?, ?);
SQL;
$roomDatePartsInsertStmt = $pdo_conn->prepare($sql);

foreach($data['result']['items'] as $row) {
    $roomInsertStmt->execute([
        $row['id'],
        $row['name'],
        $row['description'],
        json_encode($row['_relationships'] ?? []),
        $row['date_created'],
        $row['date_updated']
    ]);

    foreach($row['available_dayparts'] as $id => $date) {
        $roomDatePartsInsertStmt->execute([
            $id,
            $row['id'],
            $date['name'],
            $date['start_date']
        ]);
    }
}

echo "Imported Rooms!";
