<?php

use GuzzleHttp\Psr7\Query;

require_once __DIR__ . '/core/bootstrap.php';

require_once './cache_bust.php';
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

// config initialization
$conventionId = config('tte.convention_id');
$hasMoreData = true;
$events = [];
$eventIds = [];
$iterationExecutionTime = 50;
$startTime = $currentTime = microtime(true);
$atEnd = false;
$page = (int)($_GET['page'] ?? 1);

// validation
$page = ($page < 1) ? 1 : $page;

while ((($currentTime - $startTime) < $iterationExecutionTime) && !$atEnd) {
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

    $eventResponse = $client->get('https://tabletop.events/api/convention/' . $conventionId . '/events', [
        'query' => Query::build($params)
    ]);

    $contents = $eventResponse->getBody()->getContents();
    $responseData = json_decode($contents, true);

    // write file
    file_put_contents('events_' . $page . '.json', $contents);

    // maintenance
    $atEnd = ($page >= $responseData['result']['paging']['total_pages']);
    $currentTime = microtime(true);
    $page++;
}

// we've reached maxed allowed internal processing time
// check if we need to redirect to load the next segment
if (!$atEnd) {
    header('location: refresh_events.php?page=' . $page . '&i=' . rand(1, 1000000));
    exit();
}

// iterate through all files and grab contents
$events = [];
$pageNumber = 1;

while (file_exists(getLocalFileName($pageNumber))) {
    $data = json_decode(file_get_contents(getLocalFileName($pageNumber)), true);
    unlink(getLocalFileName($pageNumber));

    foreach ($data['result']['items'] as $item) {
        $events[$item['id']] = $item;
    }

    // next page
    $pageNumber++;
}

// do DB stuffs
$dbConn = require_once './db_connect.php';
/* @var $dbConn PDO */

$spaces = fetchSpaceInformation($dbConn);

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
$unassignedEvents = [];

// get initial data
foreach ($events as $row) {
    $eventTypeId = substr($row['_relationships']['type'], 15);

    if ($row['space_id'] != null) {
        // handle single rooms
        $spaceName = $row['space_name'];

        $insertStmt->execute([
            $row['id'],
            $row['room_id'] ?? "",
            $row['space_id'],
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
    } else if (isset($row['multi_spaces'])) {
        // handle multi rooms
        foreach ($row['multi_spaces'] as $spaceName) {
            $spaceData = $spaces[$spaceName];

            $insertStmt->execute([
                $row['id'],
                $spaceData['room_id'] ?? "",
                $spaceData['space_id'] ?? "",
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
                $spaceData['room_name'] ?? ""
            ]);
        }
    } else {
        // do nothing with the row
        $unassignedEvents[] = $row;
    }

    $spaceName = ($row['space_id'] != null)
        ? $row['space_name']
        : implode(',', $row['multi_spaces'] ?? []);

}

$f = fopen('refresh_time_events', 'w+');
fwrite($f, date('Y-m-d H:i:s'));
fclose($f);

// DONE!
header('Location: ./index.php');

/**
 * @param int $pageNumber
 * @return string
 */
function getLocalFileName(int $pageNumber): string
{
    return __DIR__ . DIRECTORY_SEPARATOR . 'events_' . $pageNumber . '.json';
}

// fetch space information for multiple rooms
function fetchSpaceInformation(PDO $dbConn): array
{
    $data = [];
    $sql = <<<SQL
SELECT
    s.name as space_name,
    s.id as space_id,
    s.room_id as room_id,
    r.name as room_name
FROM
    spaces AS s
    LEFT JOIN rooms AS r ON s.room_id = r.id
ORDER BY
    space_name
SQL;

    $result = $dbConn->query($sql)->fetchAll();
    foreach ($result as $row) {
        $data[$row['space_name']] = [
            'space_id' => $row['space_id'],
            'room_id' => $row['room_id'],
            'room_name' => $row['room_name'],
        ];
    }

    return $data;
}

