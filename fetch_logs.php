<?php

use GuzzleHttp\Exception\GuzzleException;

require_once __DIR__ . '/core/bootstrap.php';

// setup db connection
$pdo_conn = require_once 'db_connect.php';
/* @var $pdo_conn PDO */
$client = new GuzzleHttp\Client();

// login
$sessionId = getSessionId($client);

$insert_sql = <<<SQL
insert into
    badge_logs
(id, 
 badge_id,
 commenter_name,
 comment,
 type,
 date_created,
 date_updated
)
VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
       );
SQL;


try {
    $badges = getBadges($pdo_conn);

    $pdo_conn->query('delete from badge_logs where 1 = 1;');

    $insertStmt = $pdo_conn->prepare($insert_sql) or die($pdo_conn->errorCode());
    foreach ($badges as $badge) {
        $data = getBadgeLogs($client, $badge['id'], $sessionId);

        foreach ($data['result']['items'] as $row) {
            $insertStmt->execute([
                $row['id'],
                $row['badge_id'],
                $row['commenter_name'] ?? "",
                $row['comment'],
                $row['type'] ?? "",
                $row['date_created'],
                $row['date_updated']
            ]);
        }

        echo 'Processed: ' . $badge['name'] . '<br />';
        // rate limit ourselves
        usleep(10);
    }

} catch (GuzzleException $e) {
    print_r($e);
}


$f = fopen('refresh_time_badge_logs', 'w+');
fwrite($f, date('Y-m-d H:i:s'));
fclose($f);


/**
 * @param \GuzzleHttp\Client $client
 * @param string $badge_id
 * @param string $sessionId
 * @return mixed
 * @throws GuzzleException
 */
function getBadgeLogs(\GuzzleHttp\Client $client, string $badge_id, string $sessionId): mixed
{
    $response = $client->get(
        'https://tabletop.events/api/badge/' . $badge_id . '/logs',
        [
            'query' => [
                'session_id'  => $sessionId,
                '_items_per_page' => 100,
            ]
        ]);
    $response = $response->getBody()->getContents();
    return json_decode($response, true);
}

function getBadges(PDO $connection): Generator
{
    $sql = <<<SQL
SELECT
    *
FROM
    badges
WHERE
    id NOT IN (
        SELECT
            DISTINCT badge_id
        FROM
            badge_logs
    )
SQL;

    $result = $connection->query($sql);

    while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
        yield $row;
    }
}

/**
 * @param \GuzzleHttp\Client $client
 * @return string
 * @throws GuzzleException
 */
function getSessionId(\GuzzleHttp\Client $client): string
{
    $loginResponse = $client->post('https://tabletop.events/api/session', [
        'form_params' => [
            'username' => secret('tte.api_user'),
            'password' => secret('tte.api_password'),
            'api_key_id' => secret('tte.api_key'),
        ]
    ]);

    $loginData = json_decode($loginResponse->getBody()->getContents(), true);
    return $loginData['result']['id'];
}
