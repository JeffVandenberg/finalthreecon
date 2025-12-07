<?php
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

require_once 'vendor/autoload.php';

// setup db connection
$pdo_conn = require_once 'db_connect.php';
/* @var $pdo_conn PDO */

$sqlDir = './sql/';

runAllUpdateFiles($sqlDir, $pdo_conn);


/**
 * @param array $files
 * @param string $sqlDir
 * @param PDO $pdo_conn
 * @return void
 */
function runAllUpdateFiles(string $sqlDir, PDO $pdo_conn): void
{
    $files = listAllFiles($sqlDir);

    // read index for last update
    $lastVersion = 0;
    $currentVersion = 0;
    if(file_exists('last_db_version')) {
        $lastVersion = file_get_contents('last_db_version');
    }

    // run files in order
    foreach ($files as $file) {
        $currentVersion = (int)substr($file, 0, strpos($file, '_'));

        if ($currentVersion > $lastVersion) {
            echo "Running $file<br />";

            $sql = file_get_contents($sqlDir . $file);
            $pdo_conn->exec($sql);
        } else {
            echo "Skipping $file<br />";
        }
    }

    echo "Current DB Version: " . $currentVersion . '<br />';
    // write version
    $f = fopen('last_db_version', 'w+');
    fwrite($f, date($currentVersion));
    fclose($f);
}

/**
 * @param string $sqlDir
 * @return array|void
 */
function listAllFiles(string $sqlDir)
{
    $directory = dir($sqlDir) or die('Unable to read SQL directory');

    $files = [];
    while ($file = $directory->read()) {
        if (in_array($file, ['.', '..'])) {
            continue;
        }

        $files[] = $file;
    }

    natsort($files);
    return $files;
}
