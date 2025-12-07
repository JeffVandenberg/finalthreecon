<?php
require_once 'vendor/autoload.php';

// login
$client = new GuzzleHttp\Client();

$loginResponse = $client->post('https://tabletop.events/api/session', [
    'form_params' => [
        'username' => 'jeffvandenberg',
        'password' => 'PkExxDxPI5jCT7xp!KDi50Sdc!n',
        'api_key_id' => '732CF58A-930F-11F0-AB91-06778B8BBAF3',
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
    $eventResponse = $client->get('https://tabletop.events/api/convention/D46EFC1C-696B-11F0-B23F-52367E479804/badges', [
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
    echo "Getting more data<br />";
}

// do DB stuffs
$dbConn = require_once './db_connect.php';
/* @var $dbConn PDO */

// truncate
$dbConn->exec('TRUNCATE badges;');

// insert
$sql = <<<SQL
INSERT INTO
    badges
    (id, badgetype_id, badge_number, shortname, name, custom_fields, user_id, date_created, date_updated, 
     relationships, badge_display_name, pronouns, checked_in)
VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
SQL;
$insertStmt = $dbConn->prepare($sql);

// get initial data
foreach ($events as $row) {

    $insertStmt->execute([
        $row['id'],
        $row['badgetype_id'] ?? "",
        $row['badge_number'] ?? "",
        $row['shortname'] ?? "",
        $row['name'] ?? "",
        json_encode($row['custom_fields']),
        $row['user_id'] ?? "",
        $row['date_created'] ?? "",
        $row['date_updated'] ?? "",
        json_encode($row['_relationships']),
        $row['custom_fields']['BadgeDisplayName'] ?? 'Unspecified Badge Display Name',
        $row['custom_fields']['Pronouns'] ?? "",
        $row['checked_in']
    ]);
}

$f = fopen('refresh_time_badges', 'w+');
fwrite($f, date('Y-m-d H:i:s'));
fclose($f);

// DONE!
header('Location: ./index.php');
echo "<br /><br /><a href=\"./index.php\">Return Home</a>";
