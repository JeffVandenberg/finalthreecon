<?php
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

require_once __DIR__ . '/core/bootstrap.php';

$pdo = require_once __DIR__ . '/db_connect.php';

// Fetch TTE API credentials
$conventionId = config('tte.convention_id');
$apiKey = secret('tte.api_key');
$apiUser = secret('tte.api_user');
$apiPassword = secret('tte.api_password');

if (!$conventionId || !$apiKey || !$apiUser || !$apiPassword) {
    die("Missing TTE API credentials. Please configure tte.convention_id, tte.api_key, tte.api_user, and tte.api_password in config/secrets.php or environment variables.\n");
}

// Initialize Guzzle client
$client = new Client([
    'base_uri' => 'https://tabletop.events/api/',
    'timeout' => 30.0,
]);

// Create session
try {
    $sessionResponse = $client->request('POST', 'session', [
        'form_params' => [
            'username' => $apiUser,
            'password' => $apiPassword,
            'api_key_id' => $apiKey,
        ]
    ]);

    $sessionData = json_decode($sessionResponse->getBody()->getContents(), true);
    $sessionId = $sessionData['result']['id'] ?? null;

    if (!$sessionId) {
        die("Failed to retrieve session ID from API response.\n");
    }
} catch (GuzzleException $e) {
    die("Failed to create session: " . $e->getMessage() . "\n");
}

// Fetch all rooms from database
$stmt = $pdo->query("SELECT id, name, relationships FROM rooms ORDER BY name");
$rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($rooms)) {
    die("No rooms found in database. Please run import_rooms.php first.\n");
}

// Process each room
$totalEventTypes = 0;
$processedRooms = 0;

$pdo->exec("TRUNCATE TABLE room_eventtypes");

foreach ($rooms as $room) {
    $roomId = $room['id'];
    $roomName = $room['name'];
    $relationships = json_decode($room['relationships'] ?? '{}', true);

    try {
        // Fetch event types for this room
        $response = $client->request('GET', $relationships['eventtyperooms'], [
            'query' => [
                'session_id' => $sessionId,
                '_items_per_page' => 100,
            ]
        ]);

        $data = json_decode($response->getBody()->getContents(), true);
        $eventTypes = $data['result']['items'] ?? [];

        if (empty($eventTypes)) {
            continue;
        }

        // Insert or update event types for this room
        $insertStmt = $pdo->prepare("
            INSERT INTO room_eventtypes (room_id, eventtype_id)
            VALUES (:room_id, :eventtype_id)
        ");

        $roomEventTypeCount = 0;
        foreach ($eventTypes as $eventType) {
            $eventtypeId = $eventType['eventtype_id'] ?? null;

            if ($eventtypeId) {
                $insertStmt->execute([
                    'room_id' => $roomId,
                    'eventtype_id' => $eventtypeId,
                ]);
                $roomEventTypeCount++;
            }
        }

        $totalEventTypes += $roomEventTypeCount;
        $processedRooms++;

        // Be nice to the API
        usleep(250000); // 250ms delay between requests

    } catch (GuzzleException $e) {
        echo "  ERROR: Failed to fetch event types: " . $e->getMessage() . "\n<br />";
    } catch (PDOException $e) {
        echo "  ERROR: Database error: " . $e->getMessage() . "\n<br />";
    }
}

header('Location: ./index.php');