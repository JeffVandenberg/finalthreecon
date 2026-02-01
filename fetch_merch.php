<?php
use GuzzleHttp\Exception\GuzzleException;

require_once __DIR__ . '/core/bootstrap.php';

// setup db connection
$pdo_conn = require_once 'db_connect.php';
/* @var $pdo_conn PDO */

// setup external helpers
$client = new GuzzleHttp\Client();

// login
$sessionId = getSessionId($client);

$insert_sql = <<<SQL
insert into
    products
(id, 
 badge_id,
 variant_name,
 picked_up,
 pick_up_date
)
VALUES (
        ?,
        ?,
        ?,
        ?,
        ?
       );
SQL;


try {
    $badges = getBadges($pdo_conn);
    /*$badges = [
        [
            'name' => 'Bambi',
            'id' => '17C5B9EA-23F2-11EE-B784-965ECEEB5F10'
        ]
    ];*/
    $pdo_conn->query('delete from products where 1 = 1;');

    $insertStmt = $pdo_conn->prepare($insert_sql) or die($pdo_conn->errorCode());
    foreach ($badges as $badge) {
        echo 'Processing: ' . $badge['name'] . '<br />';
        $data = getMerchForBadge($client, $badge['id'], $sessionId);

        if($data['result']['paging']['total_items'] == 0) {
            continue;
        }

        foreach ($data['result']['items'] as $row) {
            $insertStmt->execute([
                $row['id'],
                $row['badge_id'],
                $row['productvariant']['name'],
                $row['picked_up'],
                $row['pick_up_date']
            ]);
        }

        // rate limit ourselves
        //usleep(100);
    }

} catch (GuzzleException $e) {
    print_r($e);
}


$f = fopen('refresh_time_merch', 'w+');
fwrite($f, date('Y-m-d H:i:s'));
fclose($f);


/**
 * @param \GuzzleHttp\Client $client
 * @param string $badge_id
 * @param string $sessionId
 * @return mixed
 * @throws GuzzleException
 */
function getMerchForBadge(\GuzzleHttp\Client $client, string $badge_id, string $sessionId): mixed
{
    $response = $client->get(
        'https://tabletop.events/api/badge/' . $badge_id . '/soldproducts' .
        '?session_id=' . $sessionId .
        '&_include_relationships=1' .
        '&_items_per_page=100' .
        '&_include=product' .
        '&_include_related_objects=productvariant'
    );

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
