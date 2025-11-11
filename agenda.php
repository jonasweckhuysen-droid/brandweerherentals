<?php
header('Content-Type: application/json');
$icsUrl = 'https://calendar.google.com/calendar/ical/df2fa36fb8ea4044f8276cf20d9922d6c350e7f7604bb5ad4a53521324f78727%40group.calendar.google.com/private-17d5bd8642d7c8b8e6f0e05b731579ac/basic.ics';
$icsContent = file_get_contents($icsUrl);

function parseICSToJSON($ics) {
    $lines = explode("\n", $ics);
    $events = [];
    $current = [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === 'BEGIN:VEVENT') $current = [];
        elseif ($line === 'END:VEVENT') {
            $events[] = $current;
            $current = [];
        } else {
            if (strpos($line, 'SUMMARY:') === 0) $current['summary'] = substr($line, 8);
            elseif (strpos($line, 'DTSTART') === 0) $current['start'] = substr($line, strpos($line, ':')+1);
            elseif (strpos($line, 'DTEND') === 0) $current['end'] = substr($line, strpos($line, ':')+1);
            elseif (strpos($line, 'LOCATION:') === 0) $current['description'] = substr($line, 9);
        }
    }
    $now = new DateTime();
    return array_values(array_filter($events, function($e) use ($now){
        return isset($e['start']) && new DateTime($e['start']) >= $now;
    }));
}

echo json_encode(parseICSToJSON($icsContent));
?>
