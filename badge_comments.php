<?php
require_once 'vendor/autoload.php';
require_once './cache_bust.php';

$pdoConn = require_once 'db_connect.php';
/* @var $pdoConn PDO */

$reportSql = <<<SQL
select
    b.id AS badge_id,
    b.badge_number,
    commenter_name,
    comment,
    type,
    bl.date_created
from
    badge_logs AS bl
    LEFT JOIN badges AS b ON bl.badge_id = b.id
WHERE
    bl.type = 'Comment'
ORDER BY
    bl.date_created DESC;
SQL;

$result = $pdoConn->query($reportSql);

?>

<html lang="en">
<head>
    <title>Badge Comments</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        tr:nth-child(even) {
            background-color: #ccc;
        }

        td {
            padding: 4px;
        }
    </style>
</head>
<body class="bg-white">
<div class="text-center border-2 border-black rounded p-3 mb-10">
    <div style="float:left;">
        <a href="./index.php">Report Home</a>
    </div>
    &nbsp;
    <div style="float: right;">
        Last Update: <?= file_get_contents('refresh_time_badge_logs') ?>
    </div>
</div>
<table class="">
    <thead class="sticky top-0 bg-white border-b">
    <tr>
        <th>Badge Number</th>
        <th>Name</th>
        <th>Comment</th>
        <th>Type</th>
        <th>Timestamp</th>
    </tr>
    </thead>
    <tbody>
    <?php while($row = $result->fetch(PDO::FETCH_ASSOC)): ?>
    <tr>
        <td><a href="https://tabletop.events/conventions/final-three-con-2026/badges/<?=$row['badge_id'] ?>" target="_blank"><?= $row['badge_number']; ?></a></td>
        <td><?= $row['commenter_name']; ?></td>
        <td><?= $row['comment']; ?></td>
        <td><?= $row['type']; ?></td>
        <td><?= $row['date_created']; ?></td>
    </tr>
    <?php endwhile; ?>
    </tbody>
</table>
<script>
</script>
</body>
</html>
