<?php
// agenda.php — PHP-proxy voor Google Agenda ICS

// Jouw Google Agenda ICS URL
$ics_url = "https://calendar.google.com/calendar/ical/df2fa36fb8ea4044f8276cf20d9922d6c350e7f7604bb5ad4a53521324f78727%40group.calendar.google.com/private-17d5bd8642d7c8b8e6f0e05b731579ac/basic.ics";

// Cache-bestand op de server
$cache_file = __DIR__ . '/agenda_cache.ics';
$cache_time = 15 * 60; // 15 minuten

// Functie om ICS te cachen
function fetchICS($url, $cache_file, $cache_time) {
    // Als cache recent genoeg is, geef het door
    if (file_exists($cache_file) && (time() - filemtime($cache_file) < $cache_time)) {
        return file_get_contents($cache_file);
    }

    // Anders download ICS
    $options = [
        "http" => [
            "header" => "User-Agent: Mozilla/5.0\r\n"
        ]
    ];
    $context = stream_context_create($options);
    $data = @file_get_contents($url, false, $context);

    if ($data) {
        // Cache lokaal
        file_put_contents($cache_file, $data);
        return $data;
    } elseif (file_exists($cache_file)) {
        // Als download faalt, gebruik oude cache
        return file_get_contents($cache_file);
    } else {
        return false;
    }
}

// ICS ophalen
$ics_data = fetchICS($ics_url, $cache_file, $cache_time);

if ($ics_data === false) {
    http_response_code(500);
    echo "Kan agenda niet laden.";
    exit;
}

// Headers instellen voor frontend
header("Content-Type: text/calendar; charset=utf-8");
header("Cache-Control: max-age=60"); // korte caching aan browserzijde
echo $ics_data;
