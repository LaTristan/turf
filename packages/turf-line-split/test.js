const fs = require('fs');
const test = require('tape');
const path = require('path');
const load = require('load-json-file');
const write = require('write-json-file');
const {featureEach} = require('@turf/meta');
const {point, lineString, featureCollection} = require('@turf/helpers');
const lineSplit = require('./');

const directories = {
    in: path.join(__dirname, 'test', 'in') + path.sep,
    out: path.join(__dirname, 'test', 'out') + path.sep
};

const fixtures = fs.readdirSync(directories.in).map(filename => {
    return {
        filename,
        name: path.parse(filename).name,
        geojson: load.sync(directories.in + filename)
    };
});

test('turf-line-split', t => {
    for (const {filename, name, geojson}  of fixtures) {
        const line = geojson.features[0];
        const splitter = geojson.features[1];
        const results = colorize(lineSplit(line, splitter));
        featureEach(geojson, feature => results.features.push(feature));

        if (process.env.REGEN) write.sync(directories.out + filename, results);
        t.deepEquals(results, load.sync(directories.out + filename), name);
    }
    t.end();
});

test('turf-line-split -- throws', t => {
    const pt = point([9, 50]);
    const line = lineString([[7, 50], [8, 50], [9, 50]]);

    t.throws(() => lineSplit(null, pt), '<geojson> is required');
    t.throws(() => lineSplit(line, null), '<geojson> is required');
    t.throws(() => lineSplit(pt, pt), '<line> must be LineString');
    t.throws(() => lineSplit(line, featureCollection([pt, line])), '<splitter> cannot be a FeatureCollection');

    t.end();
});

test('turf-line-split - splitter exactly on end of line', t => {
    const pt = point([9, 50]);
    const line = lineString([[7, 50], [8, 50], [9, 50]]);
    const features = lineSplit(line, pt).features;

    t.deepEqual(features, [line], 'should only contain 1 line of 3 vertices');
    t.end();
});


test('turf-line-split - lines should only contain 2 vertices #688', t => {
    const middlePoint = point([8, 50]);
    const line = lineString([[7, 50], [8, 50], [9, 50]]);
    const [line1, line2] = lineSplit(line, middlePoint).features;

    t.deepEqual(line1, lineString([[7, 50], [8, 50]]), 'line1 should have 2 vertices');
    t.deepEqual(line2, lineString([[8, 50], [9, 50]]), 'line2 should have 2 vertices');
    t.end();
});

test("turf-line-split - precision issue #852", t => {
    const line = lineString([[9.2202022, 49.1438226], [9.2199531, 49.1439048], [9.2196177, 49.1440264]]);
    const startPoint = point([9.2202022, 49.1438226]);
    const middlePoint = point([9.2199531, 49.1439048]);
    const endPoint = point([9.2196177, 49.1440264]);
    const [line1, line2] = lineSplit(line, middlePoint).features;

    t.deepEqual(line1, lineString([[9.2202022, 49.1438226], [9.2199531, 49.1439048]]), 'middlePoint: line1 should have 2 vertices');
    t.deepEqual(line2, lineString([[9.2199531, 49.1439048], [9.2196177, 49.1440264]]), 'middlePoint: line2 should have 2 vertices');
    t.deepEqual(lineSplit(line, startPoint).features, [line], 'startPoint: should only contain 1 line of 3 vertices');
    t.deepEqual(lineSplit(line, endPoint).features, [line], 'endPoint: should only contain 1 line of 3 vertices');
    t.end();
});


/**
 * Colorize FeatureCollection
 *
 * @param {FeatureCollection|Feature<any>} geojson Feature or FeatureCollection
 * @returns {FeatureCollection<any>} colorized FeatureCollection
 */
function colorize(geojson) {
    const results = [];
    featureEach(geojson, (feature, index) => {
        const r = (index % 2 === 0) ? 'F' : '0';
        const g = '0';
        const b = (index % 2 === 0) ? '0' : 'F';
        feature.properties = Object.assign({
            stroke: '#' + r + g + b,
            'stroke-width': 10
        }, feature.properties);
        results.push(feature);
    });
    return featureCollection(results);
}
