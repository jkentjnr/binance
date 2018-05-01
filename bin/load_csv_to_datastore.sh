#!/usr/bin/env bash
for f in 1HRS*.csv
do
    d=${f:5:8}
    echo $d
    mysql -uroot -e "USE backtester; LOAD DATA LOCAL INFILE '"$f"'INTO TABLE candlesticks COLUMNS TERMINATED BY ';' LINES TERMINATED BY '\n' IGNORE 1 LINES SET period = '1HRS', tx_day = '"$d"';"
done



#!/usr/bin/env bash
for f in 4HRS*.csv
do
    d=${f:5:8}
    echo $d
    mysql -uroot -e "USE backtester; LOAD DATA LOCAL INFILE '"$f"'INTO TABLE candlesticks COLUMNS TERMINATED BY ';' LINES TERMINATED BY '\n' IGNORE 1 LINES SET period = '4HRS', tx_day = '"$d"';"
done



#!/usr/bin/env bash
for f in 1DAY*.csv
do
    d=${f:5:8}
    echo $d
    mysql -uroot -e "USE backtester; LOAD DATA LOCAL INFILE '"$f"'INTO TABLE candlesticks COLUMNS TERMINATED BY ';' LINES TERMINATED BY '\n' IGNORE 1 LINES SET period = '1DAY', tx_day = '"$d"';"
done