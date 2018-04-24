import Gary from './gary';
import Dave from './dave';
import Brad from './brad';
import Venom from './venom';

export default class AlgorithmFactory {
	static getProcessor(key) {
		switch (key) {
			case 'gary':
				return Gary;
			case 'dave':
				return Dave;
			case 'brad':
				return Brad;
			case 'venom':
				return Venom;
		}
		return Gary;
	}
}
