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
$conventionId = config('tte.convention_id');

// get events
$hasMoreData = true;
$page = 1;
$events = [];

while ($hasMoreData) {
    // get request
    $eventResponse = $client->get('https://tabletop.events/api/convention/' . $conventionId . '/badges', [
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
fclose($

// DONE!
header('Location: ./index.php');
echo "<br /><br /><a href=\"./index.php\">Return Home</a>";
