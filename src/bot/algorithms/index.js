import Gary from './gary';

export default class AlgorithmFactory {
	static getProcessor(key) {
		return Gary;
	}
}
