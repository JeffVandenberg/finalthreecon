<?php
require_once __DIR__ . '/core/bootstrap.php';

// login
$client = new GuzzleHttp\Client();

$loginResponse = $client->post('https://tabletop.events/api/session', [
    'form_params' => [
        'username' => secret('tte.api_user'),
        'password' => secret('tte.api_password'),
        'api_key_id' => secret('tte.api_key'),
    ]
]);

$loginData = json_decode($loginResponse->getBody()->getContents(), true);
$sessionId = $loginData['result']['id'];

// get events
$hasMoreData = true;
$page = 1;
$events = [];

while ($hasMoreData) {
    // get request
    $eventResponse = $client->get('https://tabletop.events/api/convention/32D6B730-365B-11EF-B58A-DCC620F8A28C/eventtypes', [
        'query' => [
            'session_id' => $sessionId,
            '_include_relationships' => 1,
            '_items_per_page' => 100,
            '_page_number' => $page
        ]
    ]);

    $eventData = json_decode($eventResponse->getBody()->getContents(), true);

    $events = array_merge_recursive($events, $eventData['result']['items']);

    // stuff into array
    $page++;
    $hasMoreData = ($eventData['result']['paging']['page_number'] != $eventData['result']['paging']['total_pages']);
}

// do DB stuffs
$dbConn = require_once './db_connect.php';
/* @var $dbConn PDO */

// truncate
$dbConn->exec('TRUNCATE event_types;');

// insert
$sql = <<<SQL
INSERT INTO
    event_types
    (id, name, relationships)
VALUES
    (?, ?, ?);
SQL;
$insertStmt = $dbConn->prepare($sql);

// get initial data
foreach ($events as $row) {

    $insertStmt->execute([
        $row['id'],
        $row['name'] ?? "",
        json_encode($row['_relationships'])
    ]);
}

$f = fopen('refresh_time_event_types', 'w+');
fwrite($f, date('Y-m-d H:i:s'));
fclose($f);

// DONE!
header('Location: ./index.php');
