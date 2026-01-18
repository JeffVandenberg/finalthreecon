<?php
require_once 'vendor/autoload.php';

// setup db connection
$pdo_conn = require_once 'db_connect.php';
/* @var $pdo_conn PDO */

// get dayparts
$dayparts = getDayparts($pdo_conn);

$assignedEvents = getEvents($pdo_conn);

$rooms = extractRoomsWithSpaces($assignedEvents);
?>
    <html lang="en">
    <head>
        <title>Event Management</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            .event-scheduled {
                background-color: lightgreen;
                border: solid 1px black;
            }

            .event-grim-req {
                background-color: palevioletred;
                border: solid 1px black;
            }

            .event-grim-req-exp {
                background-color: mediumpurple;
                border: solid 1px black;
            }

            .room-leader {
                min-width: 160px;
                text-wrap: nowrap;
                background-color: white;
            }

            tr:nth-child(2n) {
                background-color: #dddddd;
            }
            th {
                min-width: 150px;
            }
            td {
                text-align: center;
            }
        </style>
    </head>
    <body class="bg-white">
    <div class="text-center border-2 border-black rounded p-3 mb-10">
        <div style="float:left;">
            <a href="/">Report Home</a>
        </div>

        Filters: &nbsp;&nbsp;
        <label for="day-select">Day </label>
        <select name="day" id="day-select">
            <option value="">All</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
            <option value="sunday">Sunday</option>
        </select>
        <div style="float: right;">
            Last Update: <?= file_get_contents('refresh_time_events') ?> -
            <a href="refresh_events.php" class="button">Refresh Data</a>
        </div>
    </div>
    <table class="">
        <thead class="sticky top-0 bg-white border-b">
        <tr>
            <th style="min-width: 250px;">
                Room
            </th>
            <?php foreach ($dayparts as $daypart): ?>
                <th class="<?= lcfirst($daypart['dayname']) ?>">
                    <?= str_replace(" at ", "<br />", $daypart['name']) ?><br/>
                </th>
            <?php endforeach; ?>
        </tr>
        </thead>
        <tbody>
        <?php foreach ($rooms as $roomName => $spaces): ?>
            <?php foreach($spaces as $spaceName): ?>
            <tr>
                <td class="room-leader sticky left-0">
                    <?= str_replace(" (", "<br />(", $roomName) ?><br/>
                    (<?= $spaceName; ?>)
                </td>
                <?php foreach ($dayparts as $daypart): ?>
                    <?php if (isset($assignedEvents[$roomName][$spaceName][$daypart['id']])): ?>
                        <?php
                        $cellClass = ($assignedEvents[$roomName][$spaceName][$daypart['id']]['grim_needed'] > 0)
                            ? (($assignedEvents[$roomName][$spaceName][$daypart['id']]['grim_needed'] === 2) ? 'event-grim-req-exp' : 'event-grim-req')
                            : 'event-scheduled';
                        ?>
                        <td class="<?= $cellClass ?> <?= lcfirst($daypart['dayname']) ?>">
                            <a href="https://tabletop.events<?= $assignedEvents[$roomName][$spaceName][$daypart['id']]['view_uri'] ?>"
                               target="_blank">
                                <?= $assignedEvents[$roomName][$spaceName][$daypart['id']]['name'] ?>
                            </a>
                        </td>
                    <?php else: ?>
                        <td class="event-unscheduled <?= lcfirst($daypart['dayname']) ?>">
                            ---
                        </td>
                    <?php endif; ?>
                <?php endforeach; ?>

            </tr>
            <?php endforeach; ?>
        <?php endforeach; ?>
        </tbody>
    </table>
    <script>
        function setDisplayForClass(className, visibility) {
            const elements = document.querySelectorAll(className);
            elements.forEach(element => {
                element.style.display = visibility;
            });
        }

        function toggleDisplay(targetDay) {
            if (targetDay === "") {
                // show all
                setDisplayForClass('.thursday', 'none');
                setDisplayForClass('.friday', 'table-cell');
                setDisplayForClass('.saturday', 'table-cell');
                setDisplayForClass('.sunday', 'table-cell');
            } else {
                // show only
                setDisplayForClass('.thursday', (targetDay === 'thursday') ? 'table-cell' : 'none');
                setDisplayForClass('.friday', (targetDay === 'friday') ? 'table-cell' : 'none');
                setDisplayForClass('.saturday', (targetDay === 'saturday') ? 'table-cell' : 'none');
                setDisplayForClass('.sunday', (targetDay === 'sunday') ? 'table-cell' : 'none');
            }
        }

        document.getElementById('day-select').addEventListener('change', function (e) {
            const targetDay = e.target.selectedOptions[0].value;
            toggleDisplay(targetDay);
        });

        // set initial visibility
        toggleDisplay("");
    </script>
    </body>
    </html>

<?php
/**
 * @param PDO $pdo_conn
 * @return array|void
 */
function getRooms(PDO $pdo_conn)
{
    $sql = <<<SQL
SELECT
    r.id as room_id,
    r.name as room_name,
    s.id as space_id,
    s.name as space_name
FROM 
    rooms AS r
    LEFT JOIN spaces as s ON r.id = s.room_id
ORDER BY
    r.name,
    s.name
SQL;

    $roomResults = $pdo_conn->query($sql, PDO::FETCH_ASSOC) or die($pdo_conn->errorCode());

    $rooms = [];
    while ($room = $roomResults->fetch()) {
        $rooms[] = [
            'room_id' => $room['room_id'],
            'room_name' => $room['room_name'],
            'space_id' => $room['space_id'],
            'space_name' => $room['space_name']
        ];
    }
    return $rooms;
}

/**
 * @param PDO $pdo_conn
 * @return array
 */
function getDayparts(PDO $pdo_conn): array
{
    $sql = <<<SQL
SELECT
    *
FROM 
    dayparts
ORDER BY
    start_date
SQL;

    $daypartResults = $pdo_conn->query($sql, PDO::FETCH_ASSOC) or die($pdo_conn->errorCode());

    $dayparts = [];
    while ($daypart = $daypartResults->fetch()) {
        $dayparts[] = $daypart;
    }

    return $dayparts;
}

/**
 * @param PDO $pdo_conn
 * @return array
 */
function getEvents(PDO $pdo_conn): array
{
    $eventsSql = <<<SQL
SELECT
    e.room_id,
    e.space_id,
    e.name,
    e.view_uri,
    e.description,
    e.event_number,
    e.custom_fields,
    e.space_name,
    e.room_name,
    endtimes.end_daypart_ids
FROM events AS e
         LEFT JOIN (select e.id,
                           e.startdaypart_id,
                           d.start_date,
                           GROUP_CONCAT(d.end_daypart_id) AS end_daypart_ids
                    FROM events AS e
                             LEFT JOIN (SELECT d1.id           AS start_daypart_id,
                                               d2.id           AS end_daypart_id,
                                               d1.start_date,
                                               d2.start_date   AS end_date,
                                               (UNIX_TIMESTAMP(d2.start_date) - unix_timestamp(d1.start_date)) /
                                                    60 as duration
                                        FROM dayparts AS d1
                                                 LEFT JOIN dayparts AS d2 ON d2.start_date >= d1.start_date
                                        ORDER BY d1.start_date,
                                                 d2.start_date
                                        )
                                 AS d
                                 ON e.startdaypart_id = d.start_daypart_id AND d.duration < e.duration
                    GROUP BY e.id, e.startdaypart_id
                    )
             as endtimes
             ON e.id = endtimes.id
ORDER BY
    endtimes.start_date;
SQL;

    $eventsStmt = $pdo_conn->query($eventsSql);

    $unassignedEvents = [];
    $assignedEvents = [];

    while ($event = $eventsStmt->fetch()) {
        if ($event['room_name']) {
            echo '<pre>';
            print_r($event);
            die();
            // assigned event
            $dateParts = explode(",", $event['end_daypart_ids']);
            foreach ($dateParts as $datePartId) {
                if(is_string($event['custom_fields'])) {
                    $event['custom_fields'] = json_decode($event['custom_fields'], true);
                }

                $grimNeeded = 0;
                if(isset($event['custom_fields']['GrimNeeded'])) {
                    if(str_contains($event['custom_fields']['GrimNeeded'], "Yes")) {
                        if(str_contains($event['custom_fields']['GrimNeeded'], "Exp"))  {
                            $grimNeeded = 2; // Experienced
                        } else {
                            $grimNeeded = 1; // basic
                        }
                    }
                }
                $event['grim_needed'] = $grimNeeded;

                $spaces = explode(',', $event['space_name']);
                if(count($spaces) > 0) {
                    foreach($spaces as $space) {
                        $assignedEvents[$event['room_name']][$space][$datePartId] = $event;
                    }
                }
            }
        }
    }
    return $assignedEvents;
}

function extractRoomsWithSpaces(array $assignedEvents)
{
    $rooms = [];

    foreach($assignedEvents as $roomName => $room) {
        $rooms[$roomName] = array_keys($room);
        sort($rooms[$roomName]);
    }

    // sort by keys
    ksort($rooms);

    return $rooms;
}
