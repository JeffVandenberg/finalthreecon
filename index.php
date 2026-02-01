<?php
require_once __DIR__ . '/core/bootstrap.php';
require_once './cache_bust.php';
?>

<html lang="en">
<head>
    <title>Event Management</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white p-3 container">

<h1 class="font-bold text-xl pb-5">Available Tools</h1>

<div class="container">
    <div class="container float-left w-2/3">
        <h2 class="font-bold text-l">Con Tools</h2>
        <div class="float-left w-1/2">
            <a href="events.php?i=<?= mt_rand(10000000, 99999999); ?>" class="hover:text-red-400">Event Dashboard</a>
        </div>
        <div class="float-left w-1/2">
            <a href="badge_transfers.php?i=<?= mt_rand(10000000, 99999999); ?>" class="hover:text-red-400">Badge Transfers</a>
        </div>
        <div class="float-left w-1/2">
            <a href="print_sheets.php?i=<?= mt_rand(10000000, 99999999); ?>" class="hover:text-red-400">Print all Event Sheets</a>
        </div>
        <div class="float-left w-1/2">
            <a href="badge_comments.php?i=<?= mt_rand(10000000, 99999999); ?>" class="hover:text-red-400">Badge Comments</a>
        </div>
        <div class="float-left w-1/2">
            <a href="merch_report.php?i=<?= mt_rand(10000000, 99999999); ?>" class="hover:text-red-400">Merch Report</a>
        </div>
    </div>
    <div class="container float-left w-1/3">
        <h2 class="font-bold text-l">Data Tools</h2>
        <div class="pb-2">
            <a href="refresh_base_data.php?i=<?= mt_rand(10000000, 99999999); ?>" class="hover:text-red-400">Refresh Base Data</a><br />
            <span class="text-xs">Last run: <?= file_get_contents('refresh_time_base_data'); ?></span>
        </div>
        <div class="pb-2">
            <a href="refresh_badges.php?i=<?= mt_rand(10000000, 99999999); ?>" class="hover:text-red-400">Refresh Badges</a><br />
            <span class="text-xs">Last run: <?= file_get_contents('refresh_time_badges'); ?></span>
        </div>
        <div class="pb-2">
            <a href="fetch_logs.php?i=<?= mt_rand(10000000, 99999999); ?>" class="hover:text-red-400">Refresh Badge Logs</a><br />
<!--            <span class="text-xs">Last run: --><?php //= file_get_contents('refresh_time_badge_logs'); ?><!--</span>-->
        </div>
        <div class="pb-2">
            <a href="refresh_events.php?i=<?= mt_rand(10000000, 99999999); ?>" class="hover:text-red-400">Refresh Event Data</a><br />
            <span class="text-xs">Last run: <?= file_get_contents('refresh_time_events'); ?></span>
        </div>
        <div class="pb-2">
            <a href="refresh_event_types.php?i=<?= mt_rand(10000000, 99999999); ?>" class="hover:text-red-400">Refresh Event Types</a><br />
            <span class="text-xs">Last run: <?= file_get_contents('refresh_time_event_types'); ?></span>
        </div>
        <div class="pb-2">
            <a href="fetch_merch.php?i=<?= mt_rand(10000000, 99999999); ?>" class="hover:text-red-400">Refresh Merch</a><br />
            <span class="text-xs">Last run: <?= file_get_contents('refresh_time_merch'); ?></span>
        </div>
        <div class="pb-2">
            <a href="refresh_tickets.php?i=<?= mt_rand(10000000, 99999999); ?>" class="hover:text-red-400">Refresh Tickets</a><br />
            <span class="text-xs">Last run: <?= file_get_contents('refresh_time_tickets'); ?></span>
        </div>
        <div class="pb-2">
            <a href="init_db.php?i=<?= mt_rand(10000000, 99999999); ?>" class="hover:text-red-400">Update DB</a>
        </div>
    </div>
</div>

</body>
</html>