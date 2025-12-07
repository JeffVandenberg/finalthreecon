<?php

require_once 'vendor/autoload.php';

// setup external helpers
$pdo_conn = require_once 'db_connect.php';
/* @var $pdo_conn PDO */


$defaults = [
    'picked_up' => '0',
    'badge_number' => '',
    'checked_in' => '',
    'name' => ''
];

$options = array_merge($defaults, $_GET);

$result = getMerchReport($pdo_conn, $options);
?>

    <html lang="en">
    <head>
        <title>Merch Report</title>
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
            Last Update: <?= file_get_contents('refresh_time_merch') ?>
        </div>
    </div>
    <form method="get">
    <table class="">
        <thead class="sticky top-0 bg-white border-b">
        <tr>
            <th>Badge Number</th>
            <th>Name</th>
            <th>Checked In</th>
            <th>Merch</th>
            <th>Picked Up</th>
            <th>Pickup Time</th>
        </tr>
        </thead>
        <tbody>
        <tr>
            <td>
                <label>
                    Badge:
                    <input type="text" name="badge_number" placeholder="Badge Number" value="<?= $options['badge_number'] ?>">
                </label>
            </td>
            <td>
                <label>
                    Name:
                    <input type="text" name="name" placeholder="Badge Name" value="<?= $options['name'] ?>">
                </label>
            </td>
            <td>
                <label>
                    Checked In:
                    <select name="checked_in">
                        <option value=""  <?= ($options['checked_in'] === '') ? 'selected' : '' ?>>All</option>
                        <option value="1" <?= ($options['checked_in'] === '1') ? 'selected' : '' ?>>Yes</option>
                        <option value="0" <?= ($options['checked_in'] === '0') ? 'selected' : '' ?>>No</option>
                    </select>
                </label>
            </td>
            <td></td>
            <td class="justify-center">
                <label>
                    Picked Up:
                    <select name="picked_up">
                        <option value=""  <?= ($options['picked_up'] === '') ? 'selected' : '' ?>>All</option>
                        <option value="1" <?= ($options['picked_up'] === '1') ? 'selected' : '' ?>>Yes</option>
                        <option value="0" <?= ($options['picked_up'] === '0') ? 'selected' : '' ?>>No</option>
                    </select>
                </label>
            </td>
            <td style="text-align: center;">
                <button type="submit" value="Update" class="rounded bg-indigo-500 text-white p-1">Update</button>
            </td>
        </tr>
        <?php while($row = $result->fetch(PDO::FETCH_ASSOC)): ?>
            <tr>
                <td><a href="https://tabletop.events/conventions/final-three-con-2026/badges/<?=$row['badge_id'] ?>" target="_blank"><?= $row['badge_number']; ?></a></td>
                <td><?= $row['badge_display_name']; ?></td>
                <td><?= $row['checked_in'] ? 'Yes' : 'No'; ?></td>
                <td><?= $row['variant_name']; ?></td>
                <td><?= $row['picked_up'] ? 'Yes' : 'No'; ?></td>
                <td><?= $row['picked_up'] ? $row['pick_up_date'] : ''; ?></td>
            </tr>
        <?php endwhile; ?>
        </tbody>
    </table>
    </form>

    <script>
    </script>
    </body>
    </html>


<?php
/**
 * @param PDO $pdo_conn
 * @param array $options
 * @return PDOStatement
 */
function getMerchReport(PDO $pdo_conn, array $options)
{
    $sql = <<<SQL
SELECT
    *
FROM 
    badges AS b
    INNER JOIN products as p ON b.id = p.badge_id
WHERE
    1 = 1

SQL;

    $params = [];
    // process options
    if($options['picked_up'] !== '') {
        $sql .= ' AND p.picked_up = ? ';
        $params[] = $options['picked_up'];
    }

    if($options['checked_in'] !== '') {
        $sql .= ' AND b.checked_in = ? ';
        $params[] = $options['checked_in'];
    }

    if($options['name'] !== '') {
        $sql .= ' AND b.badge_display_name LIKE ? ';
        $params[] = $options['name'] . '%';
    }

    if($options['badge_number'] !== '') {
        $sql .= ' AND b.badge_number = ? ';
        $params[] = $options['badge_number'];
    }

    // append sorting
    $sql .= <<<SQL
ORDER BY
    b.badge_number,
    p.variant_name
SQL;

    // fetch result
    $statement = $pdo_conn->prepare($sql);
    $statement->execute($params);
    return $statement;
}
