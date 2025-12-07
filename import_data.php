<?php
require_once '.\vendor\autoload.php';


$conn = mysqli_connect('localhost', 'root', '', 'clocktowercon');
$insert_sql = <<<SQL
INSERT INTO
    clocktowercon.badges
    (
     id, 
     badgetype_id, 
     badge_number, 
     shortname,
     name,
     custom_fields,
     user_id,
     date_created,
     date_updated,
     relationships
    )
VALUES (?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?)
SQL;

for ($i = 1; $i < 9; $i++) {
    // import each record
    $content = file_get_contents('badges'.$i.'.json');
    $data = json_decode($content, true);

    foreach($data['result']['items'] as $row) {
        $data = [
            $row['id'],
            $row['badgetype_id'],
            $row['badge_number'],
            $row['shortname'],
            $row['name'],
            json_encode($row['custom_fields']),
            $row['user_id'],
            $row['date_created'],
            $row['date_updated'],
            json_encode($row['_relationships'])
        ];

        //print_r($data);
        $conn->execute_query($insert_sql, $data);
    }
}