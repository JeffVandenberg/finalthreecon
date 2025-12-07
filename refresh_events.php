<?php
use GuzzleHttp\Psr7\Query;

require_once 'vendor/autoload.php';
require_once './cache_bust.php';
// login
$client = new GuzzleHttp\Client();

$loginResponse = $client->post('https://tabletop.events/api/session', [
    'form_params' => [
        'username' => 'jeffvandenberg',
        'password' => 'PkExxDxPI5jCT7xp!KDi50Sdc!n',
        'api_key_id' => '4404562E-75D2-11EE-8E48-9B3AD198EC94',
    ]
]);

$loginData = json_decode($loginResponse->getBody()->getContents(), true);
$sessionId = $loginData['result']['id'];

// get events
$hasMoreData = true;
$page = 1;
$events = [];

$eventIds = [];

while ($hasMoreData) {
// get request
    $params = [
        'session_id' => $sessionId,
        '_include' => [
            'hosts',
            'multi_spaces'
        ],
        '_include_relationships' => 1,
        '_items_per_page' => 100,
        '_page_number' => $page
    ];

    $eventResponse = $client->get('https://tabletop.events/api/convention/32D6B730-365B-11EF-B58A-DCC620F8A28C/events', [
        'query' => Query::build($params)
    ]);

    $contents = $eventResponse->getBody()->getContents();

    $eventData = json_decode($contents, true);

    foreach($eventData['result']['items'] as $item) {
        $events[$item['id']] = $item;
    }

    // stuff into array
    $page++;
    $hasMoreData = ($eventData['result']['paging']['page_number'] != $eventData['result']['paging']['total_pages']);
}

// save file to temp storage
file_put_contents('temp_events.json', json_encode($events));

// do DB stuffs
$dbConn = require_once './db_connect.php';
/* @var $dbConn PDO */

// truncate
$dbConn->exec('TRUNCATE events;');

// insert
$sql = <<<SQL
INSERT INTO
    events
    (id, room_id, space_id, name, event_number, type_id, 
     description, view_uri, startdaypart_id, duration, 
     event_type_id, hosts,
     relationships, events.custom_fields, date_created, date_updated, space_name, room_name)
VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
SQL;
$insertStmt = $dbConn->prepare($sql);

// get initial data
foreach ($events as $row) {
    $eventTypeId = substr($row['_relationships']['type'], 15);

    $spaceName = ($row['space_id'] != null)
        ? $row['space_name']
        : implode(',', $row['multi_spaces'] ?? []);

    $insertStmt->execute([
        $row['id'],
        $row['room_id'] ?? "",
        $row['space_id'] ?? "",
        $row['name'],
        $row['event_number'],
        $row['type_id'],
        $row['description'] ?? "",
        $row['view_uri'],
        $row['startdaypart_id'],
        $row['duration'],
        $eventTypeId,
        json_encode($row['hosts']),
        json_encode($row['_relationships']),
        json_encode($row['custom_fields']),
        $row['date_created'],
        $row['date_updated'],
        $spaceName,
        $row['room_name'] ?? ""
    ]);
}

$f = fopen('refresh_time_events', 'w+');
fwrite($f, date('Y-m-d H:i:s'));
fclose($f);

// DONE!
header('Location: ./index.php');
