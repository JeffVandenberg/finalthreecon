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
$badges = [];
$iterationExecutionTime = 50;
$startTime = $currentTime = microtime(true);
$atEnd = false;
$page = (int) ($_GET['page'] ?? 1);
// validation
$page = ($page < 1) ? 1 : $page;

while((($currentTime - $startTime) < $iterationExecutionTime) && !$atEnd) {
    // get request
    $response = $client->get('https://tabletop.events/api/convention/' . $conventionId . '/badges', [
        'query' => [
            'session_id' => $sessionId,
            '_include_relationships' => 1,
            '_items_per_page' => 100,
            '_page_number' => $page
        ]
    ]);

    $contents = $response->getBody()->getContents();
    $data = json_decode($contents, true);
    file_put_contents('badges_' . $page . '.json', $contents);

    $atEnd = ($page >= $data['result']['paging']['total_pages']);
    $currentTime = microtime(true);
    $page++;
}

// we've reached maxed allowed internal processing time
// check if we need to redirect to load the next segment
if(!$atEnd) {
    header('location: refresh_badges.php?page=' . $page . '&i=' . rand(1, 1000000));
    exit();
}

$page = 1;
$badges = [];
while(file_exists(getLocalFileName($page))) {
    $data = json_decode(file_get_contents(getLocalFileName($page)), true);
    unlink(getLocalFileName($page));

    foreach($data['result']['items'] as $item) {
        $badges[$item['id']] = $item;
    }

    // next page
    $page++;
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
foreach ($badges as $row) {
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

/**
 * @param int $pageNumber
 * @return string
 */
function getLocalFileName(int $pageNumber): string
{
    return __DIR__ . DIRECTORY_SEPARATOR . 'badges_' . $pageNumber . '.json';
}
