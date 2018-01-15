import Gary from './gary';
import Dave from './dave';

export default class AlgorithmFactory {
	static getProcessor(key) {
		switch (key) {
			case 'gary':
				return Gary;
			case 'dave':
				return Dave;
		}
		return Gary;
	}
}
