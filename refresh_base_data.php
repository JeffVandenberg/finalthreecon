<?php

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

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
$sessionId = (string) $loginData['result']['id'];
$conventionId = config('tte.convention_id');
// setup db connection
$pdo_conn = require_once 'db_connect.php';
/* @var $pdo_conn PDO */


// get spaces
try {
    refreshSpaces($client, $sessionId, $pdo_conn, $conventionId);
} catch (GuzzleException $e) {
    echo "There was an error while trying to refresh spaces.\n";
    die(1);
}

// get rooms
try {
    refreshRooms($client, $sessionId, $pdo_conn, $conventionId);
} catch (GuzzleException $e) {
    echo "There was an error while trying to refresh rooms.\n";
    die(1);
}

// get day parts
try {
    refreshDayParts($client, $sessionId, $pdo_conn, $conventionId);
} catch (GuzzleException $e) {
    echo "There was an error while trying to refresh day parts.\n";
    die(1);
}

$f = fopen('refresh_time_base_data', 'w+');
fwrite($f, date('Y-m-d H:i:s'));
fclose($f);

header('Location: ./index.php');
echo "<br /><br /><a href=\"./index.php\">Return Home</a>";


/**
 * @param Client $client
 * @param string $sessionId
 * @param PDO $pdo_conn
 * @param string $conventionId
 * @return void
 * @throws GuzzleException
 */
function refreshSpaces(Client $client, string $sessionId, PDO $pdo_conn, string $conventionId): void
{
    // get initial data
    $response = $client->get('https://tabletop.events/api/convention/' . $conventionId . '/spaces', [
        'query' => [
            'session_id' => $sessionId,
            '_include_relationships' => 1,
            '_items_per_page' => 100,
        ]
    ]);

    $data = json_decode($response->getBody()->getContents(), true);

    $sql = <<<SQL
TRUNCATE 
    spaces
SQL;
    $pdo_conn->exec($sql);

    $sql = <<<SQL
INSERT INTO
    spaces
    (id, name, room_id, relationships, date_created, date_updated)
VALUES
    (?, ?, ?, ?, ?, ?);
SQL;
    $spaceInsertStmt = $pdo_conn->prepare($sql);


    foreach($data['result']['items'] as $row) {
        $spaceInsertStmt->execute([
            $row['id'],
            $row['name'],
            $row['room_id'],
            json_encode($row['_relationships'] ?? []),
            $row['date_created'],
            $row['date_updated']
        ]);
    }
}

/**
 * @param Client $client
 * @param string $sessionId
 * @param PDO $pdo_conn
 * @param mixed $conventionId
 * @return void
 * @throws GuzzleException
 */
function refreshRooms(Client $client, string $sessionId, PDO $pdo_conn, mixed $conventionId): void
{
    // get initial data
    $response = $client->get('https://tabletop.events/api/convention/' . $conventionId . '/rooms', [
        'query' => [
            'session_id' => $sessionId,
            '_include_relationships' => 1,
            '_items_per_page' => 100,
        ]
    ]);

    $data = json_decode($response->getBody()->getContents(), true);

    $sql = <<<SQL
TRUNCATE 
    rooms
SQL;
    $pdo_conn->exec($sql);

    $sql = <<<SQL
TRUNCATE
    room_dayparts
SQL;
    $pdo_conn->exec($sql);

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
}

/**
 * @param Client $client
 * @param string $sessionId
 * @param PDO $pdo_conn
 * @param mixed $conventionId
 * @return void
 * @throws GuzzleException
 */
function refreshDayParts(Client $client, string $sessionId, PDO $pdo_conn, mixed $conventionId): void
{
    $page = 1;
    $atEnd = false;
    $dayParts = [];

    while(!$atEnd) {
        // get initial data
        $response = $client->get('https://tabletop.events/api/convention/' . $conventionId . '/dayparts', [
            'query' => [
                'session_id' => $sessionId,
                '_page_number' => $page,
                '_include_relationships' => 1,
                '_items_per_page' => 100,
            ]
        ]);

        $data = json_decode($response->getBody()->getContents(), true);
        $dayParts = array_merge_recursive($data['result']['items'], $dayParts);

        if($page >= $data['result']['paging']['total_pages']) {
            $atEnd = true;
        } else {
            $page++;
        }
    }

    $sql = <<<SQL
TRUNCATE 
    dayparts;
SQL;
    $pdo_conn->exec($sql);

    $sql = <<<SQL
INSERT INTO
    dayparts
    (id, name, start_date, dayname)
VALUES
    (?, ?, ?, ?);
SQL;
    $spaceInsertStmt = $pdo_conn->prepare($sql);

    foreach($dayParts as $row) {
        $spaceInsertStmt->execute([
            $row['id'],
            $row['name'],
            $row['start_date'],
            substr($row['name'], 0, strpos($row['name'], ' '))
        ]);
    }
}
