import Gary from './gary';
import Dave from './dave';
import Brad from './brad';

export default class AlgorithmFactory {
	static getProcessor(key) {
		switch (key) {
			case 'gary':
				return Gary;
			case 'dave':
				return Dave;
			case 'brad':
				return Brad;
		}
		return Gary;
	}
}
