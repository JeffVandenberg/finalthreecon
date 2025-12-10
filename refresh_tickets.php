<?php
require_once 'vendor/autoload.php';
require_once './cache_bust.php';

// get page number from request
$pageNumber = (int) ($_GET['page'] ?? 1);
$pageNumber = ($pageNumber < 1) ? 1 : $pageNumber;

$iterationExecutionTime = 50;

// login
$client = new GuzzleHttp\Client();

$startTime = $currentTime = microtime(true);


$loginResponse = $client->post('https://tabletop.events/api/session', [
    'form_params' => [
        'username' => secret('tte.api_user'),
        'password' => secret('tte.api_password'),
        'api_key_id' => secret('tte.api_key'),
    ]
]);

$loginData = json_decode($loginResponse->getBody()->getContents(), true);
$sessionId = $loginData['result']['id'];
$atEnd = false;

while((($currentTime - $startTime) < $iterationExecutionTime) && !$atEnd) {
    // get events
    $eventResponse = $client->get('https://tabletop.events/api/convention/32D6B730-365B-11EF-B58A-DCC620F8A28C/tickets', [
        'query' => [
            'session_id' => $sessionId,
            '_include_relationships' => 1,
            '_items_per_page' => 100,
            '_page_number' => $pageNumber
        ]
    ]);

    $contents = $eventResponse->getBody()->getContents();
    $responseData = json_decode($contents, true);

    // write file
    file_put_contents('tickets_' . $pageNumber . '.json', $contents);

    // maintenance
    $atEnd = ($pageNumber >= $responseData['result']['paging']['total_pages']);
    $currentTime = microtime(true);
    $pageNumber++;
}

// we've reached maxed allowed internal processing time
// check if we need to redirect to load the next segment
if(!$atEnd) {
    header('location: refresh_tickets.php?page=' . $pageNumber . '&i=' . rand(1, 1000000));
    exit();
}

// iterate through all files and grab contents
$events = [];
$pageNumber = 1;

while(file_exists(getLocalFileName($pageNumber))) {
    $data = json_decode(file_get_contents(getLocalFileName($pageNumber)), true);
    unlink(getLocalFileName($pageNumber));

    foreach($data['result']['items'] as $item) {
        $events[$item['id']] = $item;
    }

    // next page
    $pageNumber++;
}


// do DB stuffs
$dbConn = require_once './db_connect.php';
/* @var $dbConn PDO */

// truncate
$dbConn->exec('TRUNCATE tickets;');

// insert
$sql = <<<SQL
INSERT INTO
    tickets
    (id, event_id, badge_id, relationships)
VALUES
    (?, ?, ?, ?);
SQL;
$insertStmt = $dbConn->prepare($sql);

// get initial data
foreach ($events as $row) {
    $insertStmt->execute([
        $row['id'],
        $row['event_id'] ?? "",
        $row['badge_id'] ?? "",
        json_encode($row['_relationships'])
    ]);
}

$f = fopen('refresh_time_tickets', 'w+');
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
    return __DIR__ . DIRECTORY_SEPARATOR . 'tickets_' . $pageNumber . '.json';
}
