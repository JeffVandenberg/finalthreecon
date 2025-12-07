<?php
require_once __DIR__ . '/core/bootstrap.php';

// setup db connection
$pdo_conn = require_once 'db_connect.php';
/* @var $pdo_conn PDO */

$sql = <<<SQL
INSERT INTO
    clocktowercon.events
    (id, room_id, space_id, name, event_number, type_id, description, view_uri, startdaypart_id, duration, event_type_id, relationships, events.custom_fields, date_created, date_updated)
VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
SQL;
$spaceInsertStmt = $pdo_conn->prepare($sql);

// get initial data
for($i = 1; $i < 3; $i++) {
    $data = json_decode(file_get_contents('.\static\events' . $i . '.json'), true);

    foreach($data['result']['items'] as $row) {
        $eventTypeId = substr($row['_relationships']['type'], 14);
        $spaceInsertStmt->execute([
            $row['id'],
            $row['room_id'] ?? "",
            $row['space_id'] ?? "",
            $row['name'],
            $row['event_number'],
            $row['type_id'],
            $row['description'],
            $row['view_uri'],
            $row['startdaypart_id'],
            $row['duration'],
            $eventTypeId,
            json_encode($row['_relationships']),
            json_encode($row['custom_fields']),
            $row['date_created'],
            $row['date_updated']
        ]);
    }
}

echo "Done!";
