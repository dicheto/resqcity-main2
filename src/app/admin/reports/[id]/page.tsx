"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { useI18n } from '@/i18n';

export default function AdminReportDetailsPage() {
	const { locale } = useI18n();
	const copy = {
		loading: locale === 'ar' ? 'جار التحميل...' : locale === 'en' ? 'Loading...' : 'Зарежда се...',
		notFound: locale === 'ar' ? 'الإشارة غير موجودة' : locale === 'en' ? 'Report not found' : 'Сигналът не е намерен',
		title: locale === 'ar' ? 'تفاصيل الإشارة' : locale === 'en' ? 'Report details' : 'Детайли за сигнал',
		category: locale === 'ar' ? 'الفئة' : locale === 'en' ? 'Category' : 'Категория',
		noCategory: locale === 'ar' ? 'بدون فئة' : locale === 'en' ? 'No category' : 'Без категория',
		status: locale === 'ar' ? 'الحالة' : locale === 'en' ? 'Status' : 'Статус',
		submittedBy: locale === 'ar' ? 'مرسل من' : locale === 'en' ? 'Submitted by' : 'Подаден от',
		commentsTitle: locale === 'ar' ? 'تعليقات من المؤسسات' : locale === 'en' ? 'Institution comments' : 'Коментари от институции',
		noComments: locale === 'ar' ? 'لا توجد تعليقات' : locale === 'en' ? 'No comments' : 'Няма коментари',
		institutionFallback: locale === 'ar' ? 'مؤسسة' : locale === 'en' ? 'Institution' : 'Институция',
	};
	const params = useParams();
	const reportId = params?.id;
	const [report, setReport] = useState<any>(null);
	const [comments, setComments] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (reportId) {
			fetchReportDetails();
		}
	}, [reportId]);

	const fetchReportDetails = async () => {
		try {
			const token = localStorage.getItem('token');
			const response = await axios.get(`/api/reports/${reportId}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			setReport(response.data.report);
			setComments(response.data.comments || []);
		} catch (error) {
			console.error('Error fetching report details:', error);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return <div className="text-center py-12 admin-muted">{copy.loading}</div>;
	}

	if (!report) {
		return <div className="text-center py-12 text-[var(--a-muted)]">{copy.notFound}</div>;
	}

	return (
		<div className="px-6 py-10 max-w-4xl mx-auto">
			<h1 className="text-3xl font-semibold rc-display admin-text mb-6">{copy.title}</h1>
			<div className="rounded-2xl data-card p-5 mb-6">
				<h2 className="text-xl font-bold admin-text mb-2">{report.title}</h2>
				<p className="admin-muted mb-2">{report.description}</p>
				<div className="flex flex-wrap gap-3 text-xs admin-muted mb-2">
					<span>{copy.category}: {report.category?.nameBg || report.category?.nameEn || copy.noCategory}</span>
					<span>•</span>
					<span>{copy.status}: {report.status}</span>
					<span>•</span>
					<span>{copy.submittedBy}: {report.user?.firstName} {report.user?.lastName}</span>
					<span>•</span>
					<span>{new Date(report.createdAt).toLocaleString(locale === 'bg' ? 'bg-BG' : locale === 'ar' ? 'ar-SA' : 'en-US')}</span>
				</div>
			</div>
			<div className="rounded-2xl data-card p-5">
				<h3 className="text-lg font-semibold admin-text mb-4">{copy.commentsTitle}</h3>
				{comments.length === 0 ? (
					<p className="admin-muted">{copy.noComments}</p>
				) : (
					<ul className="space-y-4">
						{comments.map((comment: any) => (
							<li key={comment.id} className="border-b border-[var(--a-border)] pb-4">
								<div className="flex items-center gap-2 mb-2">
									<span className="font-semibold admin-text">{comment.institution?.nameBg || comment.institution?.nameEn || copy.institutionFallback}</span>
									<span className="admin-muted text-xs">{new Date(comment.createdAt).toLocaleString(locale === 'bg' ? 'bg-BG' : locale === 'ar' ? 'ar-SA' : 'en-US')}</span>
								</div>
								<p className="admin-text">{comment.text}</p>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
