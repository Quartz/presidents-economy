#!/usr/bin/env python

import csv
import json

import requests


BASE_URL = 'https://docs.google.com/spreadsheets/u/1/d/1tVRmfLX6QzoctATHbTRJhjb5KMNJUcB4vM-Wj28SCNk/export?format=csv&gid=%s'
FIRST_YEAR = 2000


def main():
    output = {}

    response = requests.get(BASE_URL % '0')
    index = list(csv.DictReader(response.content.decode('utf-8').splitlines()))

    for metric in index:
        if not metric['gid']:
            continue

        print(metric['slug'])

        response = requests.get(BASE_URL % metric['gid'])
        content = response.content.decode('utf-8').splitlines()

        data = []

        for row in csv.DictReader(content):
            if int(row['period'][:4]) < FIRST_YEAR:
                continue

            data.append({
                'period': row['period'],
                'value': float(row['value'])
            })

        metric['data'] = data
        metric['min'] = float(metric['min'])
        metric['max'] = float(metric['max'])
        metric['ticks'] = [float(d.strip()) for d in metric['ticks'].split(';')] if metric['ticks'] else None
        metric['show_plus'] = (metric['show_plus'] == 'TRUE')
        metric['show_zero'] = (metric['show_zero'] == 'TRUE')

        output[metric['slug']] = metric

    with open('src/data/metrics.json', 'w') as f:
        json.dump(output, f)


if __name__ == '__main__':
    main()
