<?php

use GuzzleHttp\Client;

require_once './vendor/autoload.php';

// setup db connection
$dbConn = require_once 'db_connect.php';
/* @var $dbConn PDO */

$sql = <<<SQL
SELECT
    e.*,
    et.name AS event_type_name,
    d.name as daypart_name,
    r.name AS room_name,
    s.name AS space_name,
    GROUP_CONCAT(CONCAT(b.badge_display_name, " (", b.pronouns, ")")) AS player_names
FROM
    events AS e
    LEFT JOIN event_types AS et ON e.event_type_id = et.id
    LEFT JOIN dayparts AS d ON e.startdaypart_id = d.id
    LEFT JOIN rooms AS r on r.id = e.room_id
    LEFT JOIN spaces AS s ON e.space_id = s.id
    LEFT JOIN tickets AS t ON e.id = t.event_id
    LEFT JOIN badges AS b ON t.badge_id = b.id
/*WHERE
    et.name IN (
                "Teensyville Clocktower",
                "Blood on the Clocktower",
                "Small Circle Clocktower ( Max of 9 players )",
                "BotC Tracks Workshop", 
                "Food", 
                "Large Special Event (>50 people)", 
                "LRG", 
                "Meetup Special Event", 
                "Panel", 
                "Tracks Workshop"
       )*/
GROUP BY
    e.id
ORDER BY
    et.name,
    r.name,
    d.start_date
SQL;

$results = $dbConn->query($sql) or die('unable to run query');

$pageContents = "";

/**
 * @param mixed $data
 * @return string
 */
function getBotcContents(mixed $data): string
{
    $contents = file_get_contents('templates/botc.html');

    $grimNeeded = $data['custom_fields']['GrimNeeded'] ?? "No";
    /*$tokens = 'N/A';
    if (str_contains($grimNeeded, 'Yes')) {
        if (isset($data['custom_fields']['ScriptLink'])) {
            if (str_contains($data['custom_fields']['ScriptLink'], 'botc-scripts')) {
                try {
                    $response = (new Client())->get($data['custom_fields']['ScriptLink'] . '/download');
                    $scriptData = json_decode($response->getBody()->getContents(), true);
                    $tokens = parseTokenJson($scriptData);
                } catch (\GuzzleHttp\Exception\GuzzleException $e) {
                    $tokens = 'Error Fetching Tokens from BotC Scripts';
                }
            } else {
                $tokens = 'Unparsable Script Link: ' . $data['custom_fields']['ScriptLink'];
            }
        } else {
            $tokens = 'No Script Link';
        }
    }*/

    $contents = str_replace('{name}', $data['name'], $contents);
    $contents = str_replace('{event_type}', $data['event_type_name'], $contents);
    $contents = str_replace('{duration}', $data['duration'], $contents);
    $contents = str_replace('{host}', parseHostNames($data['hosts']), $contents);
    $contents = str_replace('{room}', $data['room_name'], $contents);
    $contents = str_replace('{space}', $data['space_name'], $contents);
    $contents = str_replace('{script}', $data['custom_fields']['Script'] ?? '', $contents);
    $contents = str_replace('{start_time}', $data['daypart_name'], $contents);
    $contents = str_replace('{grim_required}', $grimNeeded, $contents);
    //$contents = str_replace('{tokens}', $tokens, $contents);

    $startPos = strpos($contents, '{attendee}');
    $startEndPos = $startPos + strlen('{attendee}');
    $endPos = strpos($contents, '{/attendee}');
    $endEndPos = $endPos + strlen('{/attendee}');

    $template = substr($contents, $startEndPos, $endPos - $startEndPos);
    $players = explode(',', $data['player_names']);

    $playerNames = "";
    foreach ($players as $i => $player) {
        $playerNames .= str_replace('{attendee_name}', $player, $template);
    }

    // attach contents
    $contents = substr($contents, 0, $startPos)
        . $playerNames
        . substr($contents, $endEndPos);
    return $contents;
}

function parseTokenJson(array $data): string
{
    $icons = array_map(function ($item) {
        $name = $item['id'];
        if ($name !== '_meta') {
            return ucwords(str_replace('_', ' ', $name));
        }
        return "";
    }, $data);

    unset($icons[0]);
    sort($icons);
    return implode(', ', $icons);
}

/**
 * @param array $data
 * @return string
 */
function parseHostNames(array $data): string
{
    return implode(', ', array_map(function ($item) {
        return $item['name'];
    }, $data));
}

/**
 * @param mixed $data
 * @return string
 */
function getSmallEventContents(mixed $data): string
{
    $contents = file_get_contents('templates/small_event.html');

    $contents = str_replace('{name}', $data['name'], $contents);
    $contents = str_replace('{event_type}', $data['event_type_name'], $contents);
    $contents = str_replace('{duration}', $data['duration'], $contents);
    $contents = str_replace('{host}', parseHostNames($data['hosts']), $contents);
    $contents = str_replace('{room}', $data['room_name'], $contents);
    $contents = str_replace('{space}', $data['space_name'], $contents);
    $contents = str_replace('{start_time}', $data['daypart_name'], $contents);

    $startPos = strpos($contents, '{attendee}');
    $startEndPos = $startPos + strlen('{attendee}');
    $endPos = strpos($contents, '{/attendee}');
    $endEndPos = $endPos + strlen('{/attendee}');

    $template = substr($contents, $startEndPos, $endPos - $startEndPos);
    $players = explode(',', $data['player_names']);

    $playerNames = "";
    foreach ($players as $player) {
        $playerNames .= str_replace('{attendee_name}', $player, $template);
    }

    // attach contents
    $contents = substr($contents, 0, $startPos)
        . $playerNames
        . substr($contents, $endEndPos);
    return $contents;
}

/**
 * @param mixed $data
 * @param array $players
 * @return string
 */
function getLargeEventContents(mixed $data): string
{
    $contents = file_get_contents('templates/large_event.html');

    $contents = str_replace('{name}', $data['name'], $contents);
    $contents = str_replace('{event_type}', $data['event_type_name'], $contents);
    $contents = str_replace('{duration}', $data['duration'], $contents);
    $contents = str_replace('{host}', parseHostNames($data['hosts']), $contents);
    $contents = str_replace('{room}', $data['room_name'], $contents);
    $contents = str_replace('{space}', $data['space_name'], $contents);
    $contents = str_replace('{start_time}', $data['daypart_name'], $contents);

    return $contents;
}

while ($data = $results->fetch(PDO::FETCH_ASSOC)) {
    $data['relationships'] = json_decode($data['relationships'], true);
    $data['custom_fields'] = json_decode($data['custom_fields'], true);
    $data['hosts'] = json_decode($data['hosts'], true);

    // switch on type
    $contents = "";
    switch ($data['event_type_name']) {
        case 'Blood on the Clocktower':
        case 'Small Circle Clocktower ( Max of 9 players)':
        case 'Teensyville Clocktower':
            $contents .= getBotcContents($data);
            break;
        case 'BotC Tracks Workshop':
        case 'Food':
        case 'Large Special Event (>50 people)':
        case 'LRG':
        case 'Meetup Special Event':
        case 'Panel':
        case 'Tracks Workshop':
            $contents .= getLargeEventContents($data);
            break;
        case 'Board Games':
        case 'BOTC Storyteller shadow':
        case 'Puzzlebox':
        case 'Small Special Event (<50 people)':
        case 'TTRPG':
        case 'Two Rooms & a Boom':
        case 'Werewolf/Mafia':
            $contents .= getSmallEventContents($data);
            break;
        default:
            $contents = 'Unknown Event Type: ' . $data['event_type_name'];
            break;
    }

    $pageContents .= $contents;
}
?>

<html lang="en">
<head>
    <title>Batch Event Sheets</title>
    <style>
        * {
            font-family: sans-serif;
        }

        .page_break {
            page-break-after: always;
            border: 0;
        }

        .width100 {
            padding-top: 10px;
            width: 100%;
            clear: both;
        }

        .width50 {
            padding-top: 10px;
            width: 50%;
            float: left;
        }

        h3 {
            clear: both;
            padding-top: 20px;
        }
    </style>
</head>
<body>
<?= $pageContents ?>
</body>
</html>
